
import { db } from "./firebase-init.js";
import { collection, getDocs, limit, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cars = [
  {name:"MIDNIGHT GT",paint:"#293342",tint:"#dfe3e9"},
  {name:"SCARLET TRACK",paint:"#a42d38",tint:"#eadfe0"},
  {name:"SILVER ARROW",paint:"#aeb4bc",tint:"#e5e7eb"},
  {name:"GOLDEN SPEC",paint:"#b28a4e",tint:"#eee7da"},
  {name:"OBSIDIAN RS",paint:"#24262c",tint:"#e2e2e6"},
  {name:"RACING BLUE",paint:"#315b8d",tint:"#dce5ee"},
  {name:"PEARL WHITE",paint:"#e5e3dd",tint:"#e9e8e4"},
  {name:"FOREST GT",paint:"#45665b",tint:"#dfe8e2"},
  {name:"VIOLET SPORT",paint:"#665276",tint:"#e7e0ec"}
];
const lineup=document.getElementById("showroomLineup");
const hero=document.querySelector(".showroom-hero");
const ticks=document.getElementById("showroomProgress");
const count=document.getElementById("showroomLookCount");
const playButton=document.getElementById("showroomPlay");
let active=0,paused=false,timer=null,startX=0,startY=0,parallaxX=0;

function carSvg(paint){
 const id=paint.replace("#","");
 return '<svg viewBox="0 0 420 190" role="img" aria-hidden="true"><defs><linearGradient id="body-'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".32" stop-color="'+paint+'"/><stop offset="1" stop-color="#17191e" stop-opacity=".55"/></linearGradient></defs><path class="car-body" style="fill:url(#body-'+id+')" d="M45 119 L62 100 Q80 91 121 87 L163 45 Q178 31 207 31 L273 34 Q291 36 309 58 L342 88 Q367 92 379 107 L386 127 L377 145 L43 145 L34 132 Z"/><path class="car-window" d="M137 85 L174 48 Q183 40 205 40 L235 41 L235 85 Z M248 41 L270 42 Q286 45 300 65 L315 85 L248 85 Z"/><path class="car-highlight" d="M65 105 Q145 91 210 94 L336 97"/><path fill="#f5e9c7" d="M45 119 L65 115 L58 126 L39 129 Z"/><path fill="#d94e42" d="M365 112 L383 116 L386 129 L369 127 Z"/><path fill="rgba(15,16,20,.55)" d="M76 143 H354 L344 153 H84 Z"/><circle class="car-wheel" cx="112" cy="143" r="31"/><circle class="car-rim" cx="112" cy="143" r="15"/><circle class="car-wheel" cx="322" cy="143" r="31"/><circle class="car-rim" cx="322" cy="143" r="15"/></svg>';
}
function buildLineup(){
 lineup.innerHTML=cars.map((car,index)=>'<button class="showroom-car" type="button" data-index="'+index+'" aria-label="Select '+car.name+'" style="--paint:'+car.paint+'"><span class="car-shadow"></span><span class="car-art">'+carSvg(car.paint)+'</span><span class="car-name">'+car.name+'</span></button>').join("");
 ticks.innerHTML=cars.map((car,index)=>'<button class="showroom-tick" type="button" data-index="'+index+'" aria-label="Show look '+(index+1)+': '+car.name+'"><span></span></button>').join("");
 lineup.querySelectorAll(".showroom-car").forEach(button=>button.addEventListener("click",()=>setActive(Number(button.dataset.index))));
 ticks.querySelectorAll(".showroom-tick").forEach(button=>button.addEventListener("click",()=>setActive(Number(button.dataset.index))));
 render();
}
function render(){
 lineup.querySelectorAll(".showroom-car").forEach(node=>{
  const index=Number(node.dataset.index);
  let offset=index-active;
  if(offset>4)offset-=9;
  if(offset< -4)offset+=9;
  const distance=Math.abs(offset);
  const scale=[1.04,.82,.67,.55,.45][distance];
  const opacity=[1,1,.92,.68,.34][distance];
  const step=window.matchMedia("(max-width: 700px)").matches?75:Math.min(154,Math.max(92,window.innerWidth*.12));
  node.style.setProperty("--shift",offset);
  node.style.setProperty("--x",(offset*step)+"px");
  node.style.setProperty("--y",(distance*(window.matchMedia("(max-width: 700px)").matches?5:7))+"px");
  node.style.setProperty("--rotation",(offset*-12)+"deg");
  node.style.setProperty("--scale",scale);
  node.style.setProperty("--opacity",opacity);
  node.style.setProperty("--z",10-distance);
  node.style.setProperty("--filter",distance===0?"contrast(1.05) saturate(1.12)":"saturate(.88)");
  node.classList.toggle("is-active",distance===0);
  node.setAttribute("aria-pressed",String(distance===0));
  node.style.pointerEvents=distance>3?"none":"auto";
  node.style.marginLeft=(parallaxX*distance*-.35)+"px";
 });
 ticks.querySelectorAll(".showroom-tick").forEach(node=>{
  const selected=Number(node.dataset.index)===active;
  node.classList.toggle("is-active",selected);
  node.querySelector("span").style.width=selected&&!paused?"100%":"0";
 });
 count.textContent="LOOK "+String(active+1).padStart(2,"0")+" / 09";
 hero.style.background="radial-gradient(ellipse at 35% 68%,"+cars[active].tint+" 0%,transparent 45%),radial-gradient(ellipse at 85% 15%,rgba(220,222,233,.55),transparent 42%),#f1f1f4";
}
function setActive(index){active=(index+cars.length)%cars.length;render();resetTimer();}
function next(){setActive(active+1);}
function previous(){setActive(active-1);}
function stopTimer(){if(timer)clearInterval(timer);timer=null;}
function startTimer(){stopTimer();if(!paused)timer=setInterval(next,3000);}
function resetTimer(){startTimer();}
function togglePause(){
 paused=!paused;
 playButton.textContent=paused?"▶":"Ⅱ";
 playButton.setAttribute("aria-label",paused?"Play carousel":"Pause carousel");
 render();startTimer();
}
document.getElementById("showroomPrev").addEventListener("click",previous);
document.getElementById("showroomNext").addEventListener("click",next);
playButton.addEventListener("click",togglePause);
document.addEventListener("keydown",event=>{
 if(event.key==="ArrowLeft")previous();
 if(event.key==="ArrowRight")next();
});
lineup.addEventListener("touchstart",event=>{startX=event.changedTouches[0].clientX;startY=event.changedTouches[0].clientY;},{passive:true});
lineup.addEventListener("touchend",event=>{
 const dx=event.changedTouches[0].clientX-startX;
 const dy=event.changedTouches[0].clientY-startY;
 if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){if(dx<0)next();else previous();}
},{passive:true});
lineup.addEventListener("wheel",event=>{
 if(Math.abs(event.deltaX)>Math.abs(event.deltaY)&&Math.abs(event.deltaX)>25){event.preventDefault();if(event.deltaX>0)next();else previous();}
},{passive:false});
const stage=document.querySelector(".showroom-stage");
stage.addEventListener("mousemove",event=>{
 const rect=stage.getBoundingClientRect();
 parallaxX=((event.clientX-rect.left)/rect.width-.5)*12;
 render();
});
stage.addEventListener("mouseleave",()=>{parallaxX=0;render();});
window.addEventListener("resize",render);
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopTimer();else startTimer();});

async function loadSetupProducts(){
 const container=document.getElementById("showroomProducts");
 try{
  const snapshot=await getDocs(query(collection(db,"accessoriesProducts"),limit(3)));
  const products=snapshot.docs.map(doc=>doc.data()).filter(product=>product&&product.active!==false).slice(0,3);
  if(!products.length){container.innerHTML='<div class="showroom-products-state">Explore miniature accessories to build your own setup.</div>';return;}
  container.innerHTML=products.map(product=>{
   const first=Array.isArray(product.images)?product.images[0]:"";
   const imageName=typeof first==="string"?first:(first&&(first.full||first.image||first.name));
   const image=imageName?"/images/products/"+encodeURIComponent(imageName)+".webp":"/images/accessories-display.webp";
   const name=escapeHTML(product.name||"Miniature accessory");
   const price=Number(product.price??product.priceNew??0);
   return '<article class="showroom-product-card"><img class="showroom-product-image" src="'+image+'" alt="'+name+'" loading="lazy"><div><h3 class="showroom-product-name">'+name+'</h3><div class="showroom-product-price">'+(price>0?"₹"+price.toLocaleString("en-IN"):"View details")+'</div></div><a class="showroom-product-link" href="/products/accessories/" aria-label="Shop '+name+'">+</a></article>';
  }).join("");
 }catch(error){
  console.error("Showroom accessories failed to load:",error);
  container.innerHTML='<div class="showroom-products-state">Accessories are available in the shop. Explore the full collection.</div>';
 }
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char]);}
buildLineup();
startTimer();
loadSetupProducts();
