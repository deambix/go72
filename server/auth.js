
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ContentError } from "./storage.js";
const digest=v=>createHash("sha256").update(v).digest();
export async function authorize(req,repo){
 const secret=process.env.ADMIN_PUBLISH_KEY;if(!secret||secret.length<32)throw new ContentError();
 const origin=req.headers.origin;if(origin){let parsed;try{parsed=new URL(origin);}catch{throw new ContentError(403);}if(parsed.host!==req.headers.host)throw new ContentError(403);}
 const supplied=req.headers["x-go72-admin-key"];const candidate=typeof supplied==="string"&&supplied.length<=512?supplied:"";
 const identity=String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown").split(",")[0].trim().slice(0,100);
 const id=createHmac("sha256",secret).update(identity).digest("hex"),now=Date.now();
 const {document}=await repo.load();const previous=document._security.attempts[id];if(previous?.lockedUntil>now)throw new ContentError(429);
 if(timingSafeEqual(digest(candidate),digest(secret))){if(previous)await repo.mutate(d=>{delete d._security.attempts[id];},undefined,{retry:5});return;}
 await repo.mutate(d=>{const map=d._security.attempts;for(const [k,a]of Object.entries(map))if(now-a.startedAt>30*60*1000&&a.lockedUntil<now)delete map[k];if(!map[id]&&Object.keys(map).length>=512)delete map[Object.keys(map).sort((a,b)=>map[a].startedAt-map[b].startedAt)[0]];const old=map[id];const count=old&&now-old.startedAt<15*60*1000?old.count+1:1;map[id]={count,startedAt:count===1?now:old.startedAt,lockedUntil:count>=5?now+15*60*1000:0};},undefined,{retry:5});
 throw new ContentError(401);
}
