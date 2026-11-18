
import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import { repository, ContentError, verify } from "./storage.js";
import { authorize } from "./auth.js";
const json=(res,status,data)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(data));};
function confirm(body,action){if(body.confirm!==action)throw new ContentError(400);}
function requiredRevision(body){if(!Number.isInteger(body.revision)||body.revision<0)throw new ContentError(400);return body.revision;}
async function bodyOf(req){if(!String(req.headers["content-type"]||"").startsWith("application/json"))throw new ContentError(415);let value=req.body;if(value===undefined){let length=0;const chunks=[];for await(const chunk of req){const b=Buffer.from(chunk);length+=b.length;if(length>4.2*1024*1024)throw new ContentError(413);chunks.push(b);}value=Buffer.concat(chunks).toString("utf8");}if(typeof value==="string"||Buffer.isBuffer(value))value=JSON.parse(String(value));if(!value||typeof value!=="object"||Array.isArray(value)||JSON.stringify(value).length>4.2*1024*1024)throw new ContentError(400);return value;}
const visibleCategories=d=>d.categories.filter(c=>c.active&&!c.archived).sort((a,b)=>a.sortOrder-b.sortOrder);
const published=d=>{const ids=new Set(visibleCategories(d).map(c=>c.id));return d.products.filter(p=>p.status==="published"&&ids.has(p.category));};
function image(d,id,alt=""){const a=d.assets.find(a=>a.id===id);return a?{id,src:a.kind==="local"?a.url:"/api/media?assetId="+encodeURIComponent(id),alt}:null;}
export function publicContent(d){return {schemaVersion:1,revision:d.revision,updatedAt:d.updatedAt,products:published(d).map(p=>({...p,stockStatus:p.stockQuantity===0||p.variants.every(v=>v.stockQuantity===0)?"out-of-stock":p.stockStatus,images:p.images.map(i=>image(d,i.assetId,i.alt)).filter(Boolean)})),categories:visibleCategories(d).map(c=>({...c,image:image(d,c.imageAssetId)})),deliveryRegions:d.deliveryRegions.filter(r=>r.enabled),settings:{...d.settings,logo:image(d,d.settings.logoAssetId)}};}
const rates=new Map();
function rate(req){const id=String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown").slice(0,100),now=Date.now();for(const[k,v]of rates)if(now-v.start>60000)rates.delete(k);if(rates.size>1000)rates.clear();const a=rates.get(id)||{start:now,count:0};a.count++;rates.set(id,a);if(a.count>90)throw new ContentError(429);}
export function createHandler(repo=repository,blob={get,put}){return async function handler(req,res){
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("X-Robots-Tag","noindex, noarchive");res.setHeader("Referrer-Policy","no-referrer");
 try{
  const url=new URL(req.url,"https://"+(req.headers.host||"localhost"));const path=url.pathname.replace(/\/$/,"");if(req.method!=="GET"&&req.method!=="POST")throw new ContentError(405);
  if(path==="/api/content"){if(req.method!=="GET")throw new ContentError(405);const {document}=await repo.load();return json(res,200,publicContent(document));}
  const admin=path.startsWith("/api/admin/");if(admin){rate(req);await authorize(req,repo);}
  if(path==="/api/media"||path==="/api/admin/image"){
   if(req.method!=="GET")throw new ContentError(405);const {document}=await repo.load();const id=url.searchParams.get("assetId");const allowed=admin||published(document).some(p=>p.images.some(i=>i.assetId===id))||visibleCategories(document).some(c=>c.imageAssetId===id)||document.settings.logoAssetId===id;
   const asset=document.assets.find(a=>a.id===id);if(!allowed||!asset||asset.kind!=="blob")throw new ContentError(404);const result=await blob.get(asset.url,{access:"private",useCache:false});if(!result)throw new ContentError(404);
   res.statusCode=200;res.setHeader("Content-Type",asset.type);for await(const b of result.stream)res.write(b);return res.end();
  }
  if(!admin)throw new ContentError(404);
  const operation=path.slice("/api/admin/".length);
  if(req.method==="GET"){const {document}=await repo.load();if(operation==="state")return json(res,200,{document:{...document,_security:undefined,checksum:undefined}});if(operation==="backup"){res.setHeader("Content-Disposition",'attachment; filename="go72-data.json"');return json(res,200,document);}throw new ContentError(404);}
  const body=await bodyOf(req),revision=requiredRevision(body);
  if(operation==="upload"){
   if(body.confirm!=="upload"||typeof body.name!=="string"||body.name.length>150||typeof body.base64!=="string"||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.base64))throw new ContentError(400);
   const buffer=Buffer.from(body.base64,"base64");if(!buffer.length||buffer.length>3*1024*1024||buffer.toString("base64")!==body.base64)throw new ContentError(413);
   let type,extension;if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){type="image/png";extension="png";}else if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255){type="image/jpeg";extension="jpg";}else if(buffer.subarray(0,4).toString()==="RIFF"&&buffer.subarray(8,12).toString()==="WEBP"){type="image/webp";extension="webp";}else throw new ContentError(415);if(body.type!==type)throw new ContentError(415);
   const {document}=await repo.load();if(document.revision!==revision)throw new ContentError(409);
   const id=randomUUID(),result=await blob.put("images/"+id+"."+extension,buffer,{access:"private",addRandomSuffix:false,allowOverwrite:false,contentType:type});const asset={id,url:result.url,kind:"blob",type,size:buffer.length,name:body.name.replace(/[\\/\u0000-\u001f]/g,"").slice(0,150),uploadedAt:new Date().toISOString()};
   const next=await repo.mutate(d=>{d.assets.push(asset);},revision);return json(res,200,{revision:next.document.revision,asset});
  }
  const result=await repo.mutate(d=>{
   if(operation==="products"){
    const action=body.action;
    if(action==="save"){const p=body.product;if(!p||typeof p.id!=="string")throw new ContentError(400);const index=d.products.findIndex(v=>v.id===p.id),old=d.products[index];if(p.status==="published"&&old?.status!=="published")confirm(body,"publish");if(old?.status==="published"&&p.status!=="published")confirm(body,p.status==="archived"?"archive":"unpublish");if(index<0)d.products.push(p);else d.products[index]=p;}
    else if(["publish","unpublish","archive","delete"].includes(action)){confirm(body,action);if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>1000||!body.ids.every(id=>typeof id==="string"&&d.products.some(p=>p.id===id)))throw new ContentError(400);const ids=new Set(body.ids);if(action==="delete")d.products=d.products.filter(p=>!ids.has(p.id));else d.products.forEach(p=>{if(ids.has(p.id))p.status=action==="publish"?"published":action==="archive"?"archived":"draft";});}
    else if(action==="duplicate"){const p=d.products.find(p=>p.id===body.id);if(!p)throw new ContentError(404);const copy=structuredClone(p);copy.id=randomUUID();copy.name=p.name.slice(0,155)+" copy";copy.slug=p.slug.slice(0,80)+"-copy-"+copy.id.slice(0,8);copy.status="draft";copy.sku="";copy.variants.forEach(v=>v.sku="");d.products.push(copy);}else throw new ContentError(400);
   }else if(operation==="categories"){
    if(body.action==="save"){const c=body.category;if(!c)throw new ContentError(400);const i=d.categories.findIndex(v=>v.id===c.id);if(i>=0&&d.categories[i].active&&!c.active)confirm(body,"deactivate");if(i>=0)d.categories[i]=c;else d.categories.push(c);}
    else if(body.action==="archive"){confirm(body,"archive");const c=d.categories.find(c=>c.id===body.id);if(!c)throw new ContentError(404);c.archived=true;c.active=false;}
    else if(body.action==="delete"){confirm(body,"delete");if(d.products.some(p=>p.category===body.id))throw new ContentError(409);d.categories=d.categories.filter(c=>c.id!==body.id);}else throw new ContentError(400);
   }else if(operation==="delivery"){
    if(body.action==="save"){const region=body.region;if(!region)throw new ContentError(400);const i=d.deliveryRegions.findIndex(r=>r.id===region.id);if(i<0)d.deliveryRegions.push(region);else d.deliveryRegions[i]=region;}
    else if(body.action==="delete"){confirm(body,"delete");d.deliveryRegions=d.deliveryRegions.filter(r=>r.id!==body.id);if(d.settings.defaultDeliveryRegionId===body.id)d.settings.defaultDeliveryRegionId="";}else throw new ContentError(400);
   }else if(operation==="settings"){d.settings=body.settings;}
   else if(operation==="restore"){confirm(body,"restore");const restored=verify(body.document);for(const key of ["products","categories","assets","deliveryRegions","settings"])d[key]=restored[key];}
   else throw new ContentError(404);
  },revision);
  return json(res,200,{revision:result.document.revision});
 }catch(error){if(res.headersSent){res.destroy();return;}const status=error instanceof ContentError?error.status:error instanceof SyntaxError?400:400;const message=status===401||status===403?"Access denied":status===429?"Try again later":status===409?"Content changed or is still in use. Reload and try again.":status===503?"Content unavailable":"Request could not be completed";json(res,status,{error:message});}
};}
export default createHandler();
