/* Public demo shell only. Bump VERSION whenever shell behavior changes. */
const VERSION="go72-v1";
const SHELL=VERSION+"-shell",STATIC=VERSION+"-static",DATA=VERSION+"-data";
const OWN_CACHES=[SHELL,STATIC,DATA];
const blocked=path=>/^\/(checkout|account|payment|payments|auth|api)(\/|$)/.test(path);
const staticAsset=path=>/^\/(assets|images|icons)\//.test(path)&&/\.(?:js|css|svg|png|webp|woff2?)$/.test(path);
self.addEventListener("install",event=>{event.waitUntil((async()=>{const shell=await caches.open(SHELL);await shell.addAll(["/","/offline.html","/manifest.webmanifest"]);const response=await shell.match("/");const html=await response.text();const assets=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>new URL(match[1],self.location.origin)).filter(url=>url.origin===self.location.origin&&staticAsset(url.pathname)).map(url=>url.pathname);const staticCache=await caches.open(STATIC);await staticCache.addAll([...new Set([...assets,"/icons/icon-192.png","/icons/icon-512.png"])]);try{const data=await caches.open(DATA);await data.add("/data/products.json");}catch{}})());});
self.addEventListener("activate",event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith("go72-")&&!OWN_CACHES.includes(key)).map(key=>caches.delete(key)));await self.clients.claim();})());});
async function fetchWithTimeout(request){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);try{return await fetch(request,{signal:controller.signal});}finally{clearTimeout(timer);}}
async function limitedPut(cache,key,response,limit=64){await cache.put(key,response);const keys=await cache.keys();if(keys.length>limit)await cache.delete(keys[0]);}
async function networkFirst(request,cacheName,fallback){const cache=await caches.open(cacheName);try{const response=await fetchWithTimeout(request);if(response.ok&&response.type!=="opaque")await cache.put(request,response.clone());if(response.status>=500){const saved=await cache.match(request);if(saved)return saved;}return response;}catch{const saved=await cache.match(request);if(saved)return saved;if(fallback)return fallback();return new Response("[]",{status:503,headers:{"Content-Type":"application/json"}});}}
self.addEventListener("fetch",event=>{const request=event.request;const url=new URL(request.url);if(request.method!=="GET"||url.origin!==self.location.origin)return;
if(blocked(url.pathname)){if(request.mode==="navigate")event.respondWith(fetch(request).catch(()=>caches.match("/offline.html")));return;}
if(request.mode==="navigate"){event.respondWith((async()=>{try{const response=await fetchWithTimeout(request);if(response.ok&&url.pathname==="/"&&!url.search){const cache=await caches.open(SHELL);await cache.put("/",response.clone());}return response;}catch{return await caches.match("/")||await caches.match("/offline.html");}})());return;}
if(url.pathname==="/data/products.json"){event.respondWith(networkFirst(request,DATA));return;}
if(staticAsset(url.pathname)){event.respondWith((async()=>{const cache=await caches.open(STATIC);const saved=await cache.match(request);if(saved)return saved;const response=await fetch(request);if(response.ok&&response.type!=="opaque")await limitedPut(cache,request,response.clone());return response;})());return;}
if(url.pathname==="/manifest.webmanifest"){event.respondWith(networkFirst(request,SHELL));}
});
