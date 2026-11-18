import "./styles/main.css";
if(location.pathname.replace(/\/$/,"")==="/admin"){import("./admin/main.js").then(m=>m.startAdmin());}else{import("./storefront.js");}
