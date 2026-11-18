import { copy } from "../content.js";
import { h, emptyState } from "../components/ui.js";
export function notFound() {return {title:copy.notFoundEyebrow,html:'<section class="container not-found"><p class="eyebrow accent">'+h(copy.notFoundEyebrow)+'</p>'+emptyState(copy.notFoundTitle,copy.notFoundBody,"/",copy.backHome)+'</section>'};}
