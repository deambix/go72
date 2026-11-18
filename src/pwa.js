import { copy } from "./content.js";
export function initPwa(){const offline=()=>{document.querySelector("[data-offline]").hidden=navigator.onLine;};window.addEventListener("online",offline);window.addEventListener("offline",offline);offline();
if("serviceWorker" in navigator&&!import.meta.env.DEV){const register=()=>navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).then(registration=>registration.update()).catch(()=>{});if(document.readyState==="complete")register();else window.addEventListener("load",register,{once:true});}
let installEvent;const prompt=document.getElementById("install-prompt");let dismissed=false;try{dismissed=localStorage.getItem("go72_install_dismissed_v1")==="1";}catch{}
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installEvent=event;document.querySelectorAll("[data-install]").forEach(button=>button.hidden=false);if(!dismissed)setTimeout(()=>{if(installEvent&&!document.body.classList.contains("is-product")&&!/^\/(checkout|account)/.test(location.pathname))prompt.hidden=false;},12000);});
document.querySelectorAll("[data-install]").forEach(button=>button.addEventListener("click",async()=>{if(!installEvent)return;prompt.hidden=true;try{await installEvent.prompt();await installEvent.userChoice;}catch{}installEvent=null;document.querySelectorAll("[data-install]").forEach(button=>button.hidden=true);}));
document.querySelector("[data-install-dismiss]").onclick=()=>{prompt.hidden=true;dismissed=true;try{localStorage.setItem("go72_install_dismissed_v1","1");}catch{}};
window.addEventListener("appinstalled",()=>{installEvent=null;prompt.hidden=true;document.querySelectorAll("[data-install]").forEach(button=>button.hidden=true);});
}
