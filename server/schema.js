
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const fail = () => { throw new Error("Invalid content"); };
const plain = v => v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const text = (v, max=500, required=false) => { if (typeof v !== "string" || v.length > max || (required && !v.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) fail(); return v.trim(); };
const number = (v, max=1e9, nullable=false) => { if (nullable && v === null) return null; if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max) fail(); return v; };
const integer = (v,max=1e9,nullable=false) => { const n=number(v,max,nullable); if(n!==null && !Number.isInteger(n)) fail(); return n; };
const boolean = v => { if (typeof v !== "boolean") fail(); return v; };
const slug = v => { const s=text(v,100,true); if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) fail(); return s; };
const currency = v => { if(typeof v!=="string" || !/^[A-Z]{3}$/.test(v) || !Intl.supportedValuesOf("currency").includes(v)) fail(); return v; };
const list = (v,max) => { if(!Array.isArray(v)||v.length>max) fail(); return v; };
function safe(v,depth=0){if(depth>12)fail();if(Array.isArray(v))v.forEach(x=>safe(x,depth+1));else if(v&&typeof v==="object"){if(!plain(v))fail();for(const [k,x]of Object.entries(v)){if(["__proto__","constructor","prototype"].includes(k))fail();safe(x,depth+1);}}}
const unique = (items,key) => { if(new Set(items.map(x=>x[key])).size!==items.length) fail(); };
const status = v => { if(!["draft","published","archived"].includes(v)) fail(); return v; };
const httpUrl = v => {const s=text(v,2000);if(!s)return "";let u;try{u=new URL(s);}catch{fail();}if(u.protocol!=="https:"||u.username||u.password)fail();return u.href;};
export function validateDocument(input) {
 safe(input);if(!plain(input)||Buffer.byteLength(JSON.stringify(input))>MAX_DOCUMENT_BYTES)fail();
 const assets=list(input.assets,3000).map(a=>{const id=slug(a.id);const url=text(a.url,2000,true);if(a.kind==="local"){if(!/^\/(?:images\/[a-z0-9-]+\.svg|favicon\.svg)$/.test(url))fail();}else if(a.kind==="blob"){const u=new URL(url);if(u.protocol!=="https:"||u.username||u.password||!u.hostname.endsWith(".private.blob.vercel-storage.com")||!/^\/images\/[a-z0-9-]+\.(png|jpg|webp)$/.test(u.pathname))fail();}else fail();return {id,url,kind:a.kind,type:text(a.type,40,true),size:integer(a.size,3*1024*1024),name:text(a.name,150),uploadedAt:text(a.uploadedAt,40)};});unique(assets,"id");
 const assetIds=new Set(assets.map(a=>a.id));
 const assetId=v=>{if(v==="")return "";const id=slug(v);if(!assetIds.has(id))fail();return id;};
 const categories=list(input.categories,100).map(c=>({id:slug(c.id),name:text(c.name,100,true),slug:slug(c.slug),description:text(c.description,2000),imageAssetId:assetId(c.imageAssetId),sortOrder:integer(c.sortOrder,100000),active:boolean(c.active),archived:boolean(c.archived)}));unique(categories,"id");unique(categories,"slug");const categoryIds=new Set(categories.map(c=>c.id));
 const products=list(input.products,1000).map(p=>{
  const category=slug(p.category);if(!categoryIds.has(category))fail();
  const variants=list(p.variants,30).map(v=>{const colour=text(v.colour,9);if(colour&&!/^#[0-9a-fA-F]{6}$/.test(colour))fail();return {id:slug(v.id),label:text(v.label,100,true),colour,size:text(v.size,60),sku:text(v.sku,100),stockQuantity:integer(v.stockQuantity,100000,true)};});if(!variants.length)fail();unique(variants,"id");
  const images=list(p.images,20).map(i=>({assetId:assetId(i.assetId),alt:text(i.alt,200)}));if(p.status==="published"&&!images.length)fail();
  const price=number(p.price,1e7),compareAtPrice=number(p.compareAtPrice,1e7,true);if(compareAtPrice!==null&&compareAtPrice<=price)fail();
  if(!["in-stock","out-of-stock","preorder"].includes(p.stockStatus))fail();
  return {id:slug(p.id),slug:slug(p.slug),name:text(p.name,160,true),category,description:text(p.description,800),fullDescription:text(p.fullDescription,15000),price,compareAtPrice,currency:currency(p.currency),stockStatus:p.stockStatus,stockQuantity:integer(p.stockQuantity,100000,true),sku:text(p.sku,100),tags:list(p.tags,30).map(t=>text(t,60,true)),images,variants,deliveryChargeOverride:number(p.deliveryChargeOverride,1e6,true),deliveryEstimateOverride:text(p.deliveryEstimateOverride,300),returnPolicyOverride:text(p.returnPolicyOverride,3000),seoTitle:text(p.seoTitle,160),metaDescription:text(p.metaDescription,320),status:status(p.status),featured:boolean(p.featured),newArrival:boolean(p.newArrival),releaseOrder:integer(p.releaseOrder,1e9),details:list(p.details,30).map(d=>({label:text(d.label,100,true),value:text(d.value,1000)})),rating:{value:null,count:0,placeholder:true}};
 });unique(products,"id");unique(products,"slug");
 const deliveryRegions=list(input.deliveryRegions,100).map(r=>({id:slug(r.id),name:text(r.name,120,true),description:text(r.description,500),charge:number(r.charge,1e6),freeThreshold:number(r.freeThreshold,1e7,true),estimate:text(r.estimate,300),currency:currency(r.currency),enabled:boolean(r.enabled)}));unique(deliveryRegions,"id");
 const s=input.settings;if(!plain(s))fail();
 const supportEmail=text(s.supportEmail,254);if(supportEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail))fail();
 const defaultDeliveryRegionId=s.defaultDeliveryRegionId?slug(s.defaultDeliveryRegionId):"";if(defaultDeliveryRegionId&&!deliveryRegions.some(r=>r.id===defaultDeliveryRegionId))fail();
 const settings={storeName:text(s.storeName,100,true),logoAssetId:assetId(s.logoAssetId),supportEmail,announcement:text(s.announcement,500),heroHeading:text(s.heroHeading,180,true),heroText:text(s.heroText,800),socialLinks:list(s.socialLinks,10).map(l=>({label:text(l.label,60,true),url:httpUrl(l.url)})),defaultCurrency:currency(s.defaultCurrency),defaultDeliveryRegionId,defaultDeliveryCharge:number(s.defaultDeliveryCharge,1e6,true),defaultDeliveryEstimate:text(s.defaultDeliveryEstimate,300),returnPolicy:text(s.returnPolicy,3000)};
 const attempts={};if(!plain(input._security)||!plain(input._security.attempts)||Object.keys(input._security.attempts).length>512)fail();
 for(const [id,a]of Object.entries(input._security.attempts)){if(!/^[a-f0-9]{64}$/.test(id))fail();attempts[id]={count:integer(a.count,10000),startedAt:integer(a.startedAt,1e15),lockedUntil:integer(a.lockedUntil,1e15)};}
 if(input.schemaVersion!==1)fail();const updatedAt=text(input.updatedAt,40,true);if(!Number.isFinite(Date.parse(updatedAt))||input.updatedBy!=="admin")fail();
 return {schemaVersion:1,revision:integer(input.revision),updatedAt,updatedBy:"admin",assets,products,categories,deliveryRegions,settings,_security:{attempts}};
}
export function parseJson(textValue){if(typeof textValue!=="string"||Buffer.byteLength(textValue)>MAX_DOCUMENT_BYTES)fail();const d=JSON.parse(textValue);safe(d);return d;}
export const slugify=value=>String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,100);
