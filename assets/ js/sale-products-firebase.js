import { db } from "./firebase-init.js";
import { collection, query, orderBy, getDocs } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function buildSaleHTML(p){

  const imgs = p.images.map(im => `
    <div class="img-box">
      <div class="img-loader"></div>
      <img src="/images/newsale/${im}.webp"
        onload="this.previousElementSibling.remove(); this.style.opacity=1"
        style="opacity:0"
        onclick="openLightbox(this.src)">
    </div>
  `).join("");
  
  const message =
`Hi Diecast.scape,
I would like to book the ${p.name}.
Is it available?`;

  const whatsappText = encodeURIComponent(message);

  return `
  <div class="section sale-product">
    <div class="diorama-title">${p.name}</div>

    <div class="slider">
      ${imgs}
      ${p.sold ? `<div class="sold-badge">SOLD</div>` : ``}
    </div>

    <div class="price">
      <span class="new">₹${p.price}</span>
    </div>

    <div class="ship">+ Shipping charges applicable</div>

    <a class="buy-btn"
      href="https://wa.me/918792744018?text=${whatsappText}"
      target="_blank">
      Book Now
    </a>
  </div>
  `;
}

async function loadSaleProducts(){

  const saleMain = document.getElementById("sale-main");
  if(!saleMain) return;

  const q = query(
    collection(db,"specialSaleProducts"),
    orderBy("created","desc")
  );

  const snap = await getDocs(q);

  let count = 0;

  snap.forEach(doc=>{
    const p = doc.data();
    if(p.active){
      saleMain.insertAdjacentHTML(
        "beforeend",
        buildSaleHTML(p)
      );
      count++;
    }
  });

  if(count === 0){
    saleMain.innerHTML = `
      <div class="sale-off" style="text-align:center;padding:20px">
        <p>No products in this sale</p>
      </div>
    `;
  }
}

window.loadSaleProducts = loadSaleProducts;

document.addEventListener("DOMContentLoaded", loadSaleProducts);
