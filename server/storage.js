
import { createHash, randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import seed from "./seed.json" with { type: "json" };
import { validateDocument, parseJson, MAX_DOCUMENT_BYTES } from "./schema.js";
export class ContentError extends Error { constructor(code=503){super("Content unavailable");this.status=code;} }
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
export function seal(input){const data=validateDocument(input);return {...data,checksum:createHash("sha256").update(JSON.stringify(canonical(data))).digest("hex")};}
export function verify(input){const data=seal(input);if(typeof input.checksum!=="string"||data.checksum!==input.checksum)throw new ContentError();return data;}
async function readStream(stream){let length=0;const chunks=[];for await(const chunk of stream){const b=Buffer.from(chunk);length+=b.length;if(length>MAX_DOCUMENT_BYTES)throw new ContentError();chunks.push(b);}return Buffer.concat(chunks).toString("utf8");}
export function createRepository(adapter={get,put}) {
 async function load(){
  try{const result=await adapter.get("go72-data.json",{access:"private",useCache:false});
   if(!result){const initial=seal({...structuredClone(seed),updatedAt:new Date().toISOString()});try{await adapter.put("go72-data.json",JSON.stringify(initial),{access:"private",contentType:"application/json",addRandomSuffix:false,allowOverwrite:false});}catch(error){if(error.name!=="BlobAlreadyExistsError")throw error;}return load();}
   const document=verify(parseJson(await readStream(result.stream)));return {document,etag:result.blob.etag};
  }catch(error){if(error instanceof ContentError)throw error;throw new ContentError();}
 }
 async function mutate(change,revision,{retry=0}={}){
  for(let attempt=0;;attempt++){const {document,etag}=await load();if(revision!==undefined&&document.revision!==revision)throw new ContentError(409);
   const next=structuredClone(document);const value=await change(next);next.revision=document.revision+1;next.updatedAt=new Date().toISOString();next.updatedBy="admin";const sealed=seal(next);
   const backup="backups/go72-data.r"+document.revision+"."+document.checksum+"."+randomUUID()+".json";
   try{await adapter.put(backup,JSON.stringify(document),{access:"private",contentType:"application/json",addRandomSuffix:false,allowOverwrite:false});await adapter.put("go72-data.json",JSON.stringify(sealed),{access:"private",contentType:"application/json",addRandomSuffix:false,allowOverwrite:true,ifMatch:etag});return {document:sealed,value};}
   catch(error){if(error.name==="BlobPreconditionFailedError"){if(attempt<retry)continue;throw new ContentError(409);}throw new ContentError();}
  }
 }
 return {load,mutate};
}
export const repository=createRepository();
