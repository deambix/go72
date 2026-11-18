
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {randomBytes} from "node:crypto";
import {readFile} from "node:fs/promises";
import {memoryBlob} from "./blob-fixture.mjs";
import {createRepository,seal,verify} from "../server/storage.js";
import {createHandler} from "../server/handler.js";
import {validateDocument} from "../server/schema.js";
process.env.ADMIN_PUBLISH_KEY=randomBytes(32).toString("hex");
test("validated schema, corruption protection, versioned backups and conditional concurrency",async()=>{
 const adapter=memoryBlob(),repo=createRepository(adapter);const initial=(await repo.load()).document;assert.equal(initial.products.length,12);assert.equal(verify(initial).checksum,initial.checksum);
 for(const change of [d=>d.products[0].price=-1,d=>d.products[1].slug=d.products[0].slug,d=>d.products[0].category="missing",d=>d.products[0].images=[{assetId:"missing",alt:""}],d=>d.products[0].variants=[],d=>d.schemaVersion=2]){const d=structuredClone(initial);change(d);assert.throws(()=>validateDocument(d));}
 const results=await Promise.allSettled([repo.mutate(d=>{d.settings.announcement="A";},initial.revision),repo.mutate(d=>{d.settings.announcement="B";},initial.revision)]);assert.equal(results.filter(r=>r.status==="fulfilled").length,1);assert.equal(results.find(r=>r.status==="rejected").reason.status,409);const current=(await repo.load()).document;assert.equal(current.revision,1);assert([...adapter.files.keys()].some(p=>p.startsWith("backups/")));assert.equal(initial.settings.announcement,"");
 const stored=adapter.files.get("go72-data.json");adapter.files.set("go72-data.json",{...stored,body:Buffer.from('{"schemaVersion":1}')});await assert.rejects(repo.load());assert.equal(adapter.files.get("go72-data.json").body.toString(),'{"schemaVersion":1}');
});
test("CMS APIs: authentication, lockout, products, categories, uploads, delivery, settings, backup and restore",async t=>{
 const adapter=memoryBlob(),repo=createRepository(adapter),server=http.createServer(createHandler(repo,adapter));await new Promise(r=>server.listen(0,"127.0.0.1",r));t.after(()=>new Promise(r=>server.close(r)));const base="http://127.0.0.1:"+server.address().port,key=process.env.ADMIN_PUBLISH_KEY;
 async function call(path,{body,auth=key,ip="127.0.0.1"}={}){const headers={"x-forwarded-for":ip};if(auth!==null)headers["x-go72-admin-key"]=auth;if(body)headers["Content-Type"]="application/json";return fetch(base+path,{headers,method:body?"POST":"GET",...(body?{body:JSON.stringify({...body,revision:(await repo.load()).document.revision})}:{})});}
 const state=async()=>(await (await call("/api/admin/state")).json()).document;
 const content=async()=>(await (await call("/api/content",{auth:null})).json());
 assert.equal((await call("/api/admin/state",{auth:null})).status,401);assert.equal((await call("/api/admin/state",{auth:"wrong-key"})).status,401);assert.equal((await call("/api/admin/state")).status,200);
 for(let i=0;i<5;i++)assert.equal((await call("/api/admin/state",{auth:"wrong-key",ip:"198.51.100.2"})).status,401);
 assert.equal((await call("/api/admin/state",{ip:"198.51.100.2"})).status,429);
 const original=await (await call("/api/admin/backup")).json();const c={id:"cms-test-category",slug:"cms-test-category",name:"Test category",description:"Test fixture only",imageAssetId:"",sortOrder:9,active:true,archived:false};
 assert.equal((await call("/api/admin/categories",{body:{action:"save",category:c}})).status,200);
 const p={...structuredClone((await state()).products[0]),id:"cms-test-product",slug:"cms-test-product",category:c.id,name:"CMS test product",status:"draft",fullDescription:"Full description test",tags:["cms-test"],seoTitle:"Test title",metaDescription:"Test metadata",deliveryChargeOverride:30,deliveryEstimateOverride:"Test estimate",returnPolicyOverride:"Test policy"};
 assert.equal((await call("/api/admin/products",{body:{action:"save",product:p}})).status,200);assert(!(await content()).products.some(v=>v.id===p.id));
 assert.equal((await call("/api/admin/products",{body:{action:"publish",ids:[p.id]}})).status,400);
 assert.equal((await call("/api/admin/products",{body:{action:"publish",ids:[p.id],confirm:"publish"}})).status,200);assert((await content()).products.some(v=>v.id===p.id));
 p.status="published";p.price=1400;assert.equal((await call("/api/admin/products",{body:{action:"save",product:p}})).status,200);assert.equal((await content()).products.find(v=>v.id===p.id).price,1400);
 assert.equal((await call("/api/admin/categories",{body:{action:"delete",id:c.id,confirm:"delete"}})).status,409);
 const image=await readFile("public/icons/icon-192.png");const uploaded=await call("/api/admin/upload",{body:{confirm:"upload",name:"test-image.png",type:"image/png",base64:image.toString("base64")}});assert.equal(uploaded.status,200);const asset=(await uploaded.json()).asset;
 assert.equal((await call("/api/media?assetId="+asset.id,{auth:null})).status,404);assert.equal((await call("/api/admin/image?assetId="+asset.id)).status,200);
 p.images=[{assetId:asset.id,alt:"Uploaded image"},...p.images];assert.equal((await call("/api/admin/products",{body:{action:"save",product:p}})).status,200);assert.equal((await content()).products.find(v=>v.id===p.id).images[0].alt,"Uploaded image");assert.equal((await call("/api/media?assetId="+asset.id,{auth:null})).status,200);
 p.images.reverse();assert.equal((await call("/api/admin/products",{body:{action:"save",product:p}})).status,200);
 assert.equal((await call("/api/admin/upload",{body:{confirm:"upload",name:"invalid.png",type:"image/png",base64:Buffer.from("not an image").toString("base64")}})).status,415);
 const region={id:"test-region",name:"Test region",description:"Fixture coverage",charge:50,freeThreshold:1000,estimate:"Test estimate",currency:"INR",enabled:true};assert.equal((await call("/api/admin/delivery",{body:{action:"save",region}})).status,200);region.charge=60;assert.equal((await call("/api/admin/delivery",{body:{action:"save",region}})).status,200);assert.equal((await content()).deliveryRegions[0].charge,60);
 const settings={...(await state()).settings,announcement:"CMS test banner",defaultDeliveryRegionId:region.id,supportEmail:"support@example.com"};assert.equal((await call("/api/admin/settings",{body:{settings}})).status,200);assert.equal((await content()).settings.announcement,"CMS test banner");
 assert.equal((await call("/api/admin/products",{body:{action:"duplicate",id:p.id}})).status,200);const copy=(await state()).products.find(v=>v.id!==p.id&&v.name===p.name+" copy");assert(copy&&copy.status==="draft");
 assert.equal((await call("/api/admin/products",{body:{action:"unpublish",ids:[p.id],confirm:"unpublish"}})).status,200);assert(!(await content()).products.some(v=>v.id===p.id));assert.equal((await call("/api/media?assetId="+asset.id,{auth:null})).status,404);
 assert.equal((await call("/api/admin/products",{body:{action:"archive",ids:[p.id],confirm:"archive"}})).status,200);assert.equal((await state()).products.find(v=>v.id===p.id).status,"archived");
 assert.equal((await call("/api/admin/products",{body:{action:"delete",ids:[p.id,copy.id],confirm:"delete"}})).status,200);
 assert.equal((await call("/api/admin/categories",{body:{action:"archive",id:c.id,confirm:"archive"}})).status,200);assert(!(await content()).categories.some(v=>v.id===c.id));assert.equal((await call("/api/admin/categories",{body:{action:"delete",id:c.id,confirm:"delete"}})).status,200);
 region.enabled=false;assert.equal((await call("/api/admin/delivery",{body:{action:"save",region}})).status,200);assert.equal((await content()).deliveryRegions.length,0);
 assert.equal((await call("/api/admin/restore",{body:{confirm:"restore",document:original}})).status,200);assert.equal((await content()).products.length,12);
 const publicResponse=JSON.stringify(await content());assert(!publicResponse.includes(key));assert(!publicResponse.includes("_security"));assert(!publicResponse.includes(".private.blob."));const backup=await (await call("/api/admin/backup")).json();assert(backup.checksum);assert(!JSON.stringify(backup).includes(key));assert([...adapter.files.keys()].filter(p=>p.startsWith("backups/")).length>10);
});
