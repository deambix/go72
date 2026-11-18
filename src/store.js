const KEY="go72_cart_v1";
const clamp=value=>Math.max(1,Math.min(9,Math.floor(Number(value)||1)));
function read() {try {const raw=JSON.parse(localStorage.getItem(KEY)||"[]");if(!Array.isArray(raw))return [];const lines=new Map();for(const item of raw.slice(0,100)){if(!item||typeof item.id!=="string"||typeof item.variant!=="string"||!/^[a-z0-9-]+$/.test(item.id)||!/^[a-z0-9-]+$/.test(item.variant))continue;const key=item.id+"|"+item.variant;const previous=lines.get(key);lines.set(key,{id:item.id,variant:item.variant,quantity:clamp((previous?.quantity||0)+clamp(item.quantity))});}return [...lines.values()];}catch{return [];}}
let cart=read();const listeners=new Set();
function save() {try{localStorage.setItem(KEY,JSON.stringify(cart));}catch{}listeners.forEach(fn=>fn(getCart()));}
export const getCart=()=>cart.map(item=>({...item}));
export const cartCount=()=>cart.reduce((sum,item)=>sum+item.quantity,0);
export function subscribe(fn) {listeners.add(fn);return()=>listeners.delete(fn);}
export function hydrateCart(products) {const valid=cart.filter(item=>{const p=products.find(p=>p.id===item.id);return p?.stockStatus==="in-stock"&&p.variants.some(v=>v.id===item.variant);});if(JSON.stringify(valid)!==JSON.stringify(cart)){cart=valid;save();}}
export function addItem(id,variant,quantity=1) {const existing=cart.find(item=>item.id===id&&item.variant===variant);if(existing)existing.quantity=clamp(existing.quantity+quantity);else cart.push({id,variant,quantity:clamp(quantity)});save();}
export function setQuantity(id,variant,value) {cart=cart.map(item=>item.id===id&&item.variant===variant?{...item,quantity:clamp(value)}:item);save();}
export function removeItem(id,variant) {cart=cart.filter(item=>item.id!==id||item.variant!==variant);save();}
export function cartLines(products) {return getCart().map(item=>({ ...item,product:products.find(p=>p.id===item.id)})).filter(item=>item.product);}
export const subtotal=products=>cartLines(products).reduce((sum,line)=>sum+line.product.price*line.quantity,0);
