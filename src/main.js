import "./styles/main.css";
import { copy } from "./content.js";
import { getProducts } from "./api.js";
import { startRouter, navigate } from "./router.js";
import { hydrateCart, subscribe, cartCount } from "./store.js";
import { shell, updateNavigation } from "./components/shell.js";
import { skeleton, h } from "./components/ui.js";
import { home } from "./pages/home.js";
import { catalogue } from "./pages/catalogue.js";
import { productPage } from "./pages/product.js";
import { cartPage } from "./pages/cart.js";
import { checkoutPage } from "./pages/checkout.js";
import { accountPage, infoPage } from "./pages/account.js";
import { notFound } from "./pages/not-found.js";
import { initPwa } from "./pwa.js";
document.getElementById("app").innerHTML=shell();
const main=document.getElementById("main");let rendering=0;let products;
function updateCount() {const count=cartCount();document.querySelectorAll("[data-cart-count]").forEach(el=>{el.textContent=String(count);el.hidden=count===0;});document.querySelectorAll(".cart-link").forEach(el=>el.setAttribute("aria-label",copy.cart+", "+count+" "+(count===1?copy.item:copy.items)));}
subscribe(updateCount);updateCount();
async function renderRoute(context) {const token=++rendering;const focused=document.activeElement;const focusId=!context.scroll&&focused?.id?focused.id:null;const selection=focusId&&focused instanceof HTMLInputElement?{start:focused.selectionStart,end:focused.selectionEnd}:null;let page;
updateNavigation(context.path);const needsData=context.path==="/"||context.path==="/catalogue"||context.path==="/search"||context.path==="/cart"||context.path==="/checkout"||context.path.startsWith("/product/");
if(needsData&&!products){main.innerHTML=skeleton();try{products=await getProducts();hydrateCart(products);updateCount();}catch{if(token!==rendering)return;main.innerHTML='<section class="container empty-state"><h1>'+h(copy.loadErrorTitle)+'</h1><p>'+h(copy.loadErrorBody)+'</p><button id="retry" class="button">'+h(copy.retry)+'</button></section>';main.querySelector("#retry").onclick=()=>renderRoute(context);return;}}
if(token!==rendering)return;
try {if(context.path==="/")page=home(products);else if(context.path==="/catalogue"||context.path==="/search")page=catalogue(products,context.params,context.path==="/search");else if(context.path.startsWith("/product/"))page=productPage(products,decodeURIComponent(context.path.slice(9)));else if(context.path==="/cart")page=cartPage(products);else if(context.path==="/checkout")page=checkoutPage(products,context.params);else if(context.path==="/account")page=accountPage();else if(context.path==="/info")page=infoPage();else page=notFound();}catch{page=notFound();}
main.innerHTML=page.html;main.removeAttribute("aria-busy");document.title=page.title+" | "+copy.brand;document.body.classList.toggle("is-product",context.path.startsWith("/product/"));page.mount?.(main);
if(/^\/(checkout|account|product)(\/|$)/.test(context.path))document.getElementById("install-prompt").hidden=true;
if(focusId){const restored=document.getElementById(focusId);if(restored?.disabled){restored.parentElement.querySelector("button:not(:disabled)")?.focus({preventScroll:true});}else if(restored){restored.focus({preventScroll:true});if(selection&&restored.type==="search"){try{restored.setSelectionRange(selection.start,selection.end);}catch{}}}}else if(!context.initial){const heading=main.querySelector("h1");if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
if(context.path==="/search"&&!context.params.has("q"))main.querySelector("#catalogue-search")?.focus({preventScroll:true});
if(context.scroll)window.scrollTo({top:0,behavior:"instant"});
}
startRouter(renderRoute);initPwa();
