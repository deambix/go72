
const KEY="go72_cart_v1",listeners=new Set();let products=[],cart=[];
const clamp=(value,max=9)=>Math.max(1,Math.min(max,Math.floor(Number(value)||1)));
try{const raw=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(raw)){const map=new Map();for(const item of raw.slice(0,100)){if(!item||typeof item.id!=="string"||typeof item.variant!=="string"||!/^[a-z0-9-]+$/.test(item.id)||!/^[a-z0-9-]+$/.test(item.variant))continue;const key=item.id+"|"+item.variant;map.set(key,{id:item.id,variant:item.variant,quantity:clamp((map.get(key)?.quantity||0)+clamp(item.quantity))});}cart=[...map.values()];}}catch{}
function save(){try{localStorage.setItem(KEY,JSON.stringify(cart));}catch{}listeners.forEach(fn=>fn(getCart()));}
function limit(id,variant){const p=products.find(p=>p.id===id),v=p?.variants.find(v=>v.id===variant);if(!p||!v||p.stockStatus==="out-of-stock")return 0;const others=cart.filter(i=>i.id===id&&i.variant!==variant).reduce((n,i)=>n+i.quantity,0);return Math.max(0,Math.min(9,p.stockQuantity===null?9:p.stockQuantity-others,v.stockQuantity===null?9:v.stockQuantity));}
export const getCart=()=>cart.map(i=>({...i}));
export const cartCount=()=>cart.reduce((n,i)=>n+i.quantity,0);
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export function hydrateCart(next){products=next;const before=JSON.stringify(cart),used=new Map(),normalized=[];for(const i of cart){const p=products.find(p=>p.id===i.id),v=p?.variants.find(v=>v.id===i.variant);if(!p||!v||p.stockStatus==="out-of-stock")continue;const max=Math.max(0,Math.min(9,(p.stockQuantity??9)-(used.get(p.id)||0),v.stockQuantity??9));if(!max)continue;const quantity=clamp(i.quantity,max);normalized.push({...i,quantity});used.set(p.id,(used.get(p.id)||0)+quantity);}cart=normalized;if(before!==JSON.stringify(cart))save();}
export function addItem(id,variant,quantity=1){const max=limit(id,variant);if(!max)return false;const previous=cart.find(i=>i.id===id&&i.variant===variant);if(previous)previous.quantity=clamp(previous.quantity+quantity,max);else cart.push({id,variant,quantity:clamp(quantity,max)});save();return true;}
export function setQuantity(id,variant,value){const max=limit(id,variant);if(!max)return removeItem(id,variant);cart=cart.map(i=>i.id===id&&i.variant===variant?{...i,quantity:clamp(value,max)}:i);save();}
export function removeItem(id,variant){cart=cart.filter(i=>i.id!==id||i.variant!==variant);save();}
export function cartLines(data){return getCart().map(i=>({...i,product:data.find(p=>p.id===i.id)})).filter(i=>i.product);}
export const subtotal=data=>cartLines(data).reduce((n,i)=>n+i.product.price*i.quantity,0);
export function subtotals(data){const result={};for(const line of cartLines(data)){const currency=line.product.currency;result[currency]=(result[currency]||0)+line.product.price*line.quantity;}return result;}
