import { db } from "./firebase-init.js";
import { collection, getDocs } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function buildProductHTML(p){

  const discount = Math.round(
    ((p.priceOld - p.priceNew) / p.priceOld) * 100
  );

  const save = p.priceOld - p.priceNew;
const imgs = p.images.map(im => `
  <div class="img-box">
    <div class="img-loader"></div>
    <img src="${im.thumb}"
      data-full="${im.full}"
      onload="this.previousElementSibling.remove(); this.style.opacity=1"
      style="opacity:0"
      onclick="openLightbox(this.dataset.full)">
  </div>
`).join("");


  const whatsappText =
    encodeURIComponent(
      `Hi Diecast.scape,\nI would like to place an order for the ${p.name}\npriced at ₹${p.priceNew} (${discount}% discount). \nKindly let me know the delivery options and payment details.`
    );

  return `
  <div class="section">
    <div class="diorama-title">${p.name}</div>

    <div class="slider">
      ${imgs}
    </div>

    <div class="price">
      <span class="old">₹${p.priceOld}</span>
      <span class="new">₹${p.priceNew}</span>
    </div>

    <div class="discount">${discount}% OFF · Save ₹${save}</div>
    <div class="ship">+ Shipping charges applicable</div>

    <button class="details-btn" onclick="openDetailsSheet(this)">
      Details ▾
    </button>

    <div class="product-details">
      ${p.detailsHTML}
    </div>

    <a class="buy-btn"
      href="https://wa.me/918792744018?text=${whatsappText}"
      target="_blank">
      Order on WhatsApp
    </a>
  </div>
  `;
}

async function loadProducts(){
  const container = document.getElementById("productsContainer");
  if(!container) return;

  const snap = await getDocs(collection(db,"products"));

  snap.forEach(doc=>{
    const p = doc.data();
    if(p.active){
      container.insertAdjacentHTML(
        "beforeend",
        buildProductHTML(p)
      );
    }
  });
}

window.addEventListener("DOMContentLoaded", loadProducts);

