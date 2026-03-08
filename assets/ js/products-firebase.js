import { db } from "./firebase-init.js";
import { collection, query, orderBy, getDocs } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function buildProductHTML(p){

  const discount = Math.round(
    ((p.priceOld - p.priceNew) / p.priceOld) * 100
  );

  const save = p.priceOld - p.priceNew;
const imgs = p.images.map(im => `
  <div class="img-box">
    <div class="img-loader"></div>
    <img src="images/products-temp/${im.thumb}.webp"
      data-full="images/products/${im.full}.webp"
      onload="this.previousElementSibling.remove(); this.style.opacity=1"
      style="opacity:0"
      onclick="openLightbox(this.dataset.full)">
  </div>
`).join("");

const message =
`Hi Diecast.scape,
I would like to place an order for the ${p.name},
priced at ₹${p.priceNew} (${discount}% discount).
Kindly let me know the delivery options and payment details.`;

const whatsappText = encodeURIComponent(message);

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
    <div class="ship">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round">
    <line x1="1" y1="8" x2="6" y2="8"/>
    <line x1="1" y1="11" x2="5" y2="11"/>
    <line x1="1" y1="14" x2="4" y2="14"/>
    <rect x="6" y="6" width="9" height="8" rx="2"/>
    <path d="M15 9h3l3 3v2h-6z"/>
    <circle cx="9" cy="17" r="2"/>
    <circle cx="18" cy="17" r="2"/>
  </svg>
Shipping charges applicable
</div>

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
  const loader = document.getElementById("productsLoader");

  if(!container) return;

  const q = query(
    collection(db,"products"),
    orderBy("created","desc")
  );

  const snap = await getDocs(q);

  let count = 0;

  snap.forEach(doc=>{
    const p = doc.data();
    if(p.active){
      container.insertAdjacentHTML(
        "beforeend",
        buildProductHTML(p)
      );
      count++;
    }
  });

  // ✅ remove loader AFTER DOM updated
  requestAnimationFrame(()=>{
    if(loader) loader.remove();
  });

  // fallback: if no products
  if(count === 0 && loader){
    loader.innerText = "No products available";
  }
}


window.addEventListener("DOMContentLoaded", loadProducts);

