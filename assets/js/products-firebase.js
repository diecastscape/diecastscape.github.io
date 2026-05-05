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
Kindly let me know the payment details.`;

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
  
  <svg width="18" height="18" viewBox="0 0 256 256">
<g style="" transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
	<polygon points="28.55,28.74 45,35.39 45,89 2.44,71.81 2.44,38.43 2.44,18.19 18.89,24.84 18.89,24.84 18.89,47.27 28.55,51.18 " style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(226,174,131); fill-rule: nonzero; opacity: 1;" transform="  matrix(1 0 0 1 0 0) "/>
	<polygon points="87.56,18.19 45,35.39 28.55,28.74 71.11,11.55 " style=" fill: rgb(226,174,131); " transform="  matrix(1 0 0 1 0 0) "/>
	<polygon points="61.45,7.64 18.89,24.84 18.89,24.84 2.44,18.19 45,1 " style=" fill: rgb(226,174,131);" transform="  matrix(1 0 0 1 0 0) "/>
	<polyline points="45,35.39 45,89 87.56,71.81 87.56,38.43 87.56,18.19 45,35.39 " style="fill: rgb(196,141,105);" transform="  matrix(1 0 0 1 0 0) "/>
	<polygon points="61.45,7.64 18.89,24.84 18.89,47.27 28.55,51.18 28.55,28.74 71.11,11.55 " style="fill: rgb(255,210,166);" transform="  matrix(1 0 0 1 0 0) "/>
	<path d="M 45 36.387 c -0.127 0 -0.254 -0.024 -0.375 -0.073 l -16.45 -6.646 c -0.512 -0.207 -0.76 -0.79 -0.553 -1.302 c 0.207 -0.512 0.791 -0.758 1.302 -0.553 L 45 34.309 l 39.89 -16.115 L 45 2.079 L 5.11 18.193 l 14.154 5.718 c 0.512 0.207 0.76 0.79 0.553 1.302 c -0.207 0.512 -0.791 0.759 -1.302 0.553 L 2.066 19.121 c -0.378 -0.153 -0.625 -0.52 -0.625 -0.927 s 0.248 -0.774 0.625 -0.927 l 42.56 -17.193 c 0.24 -0.097 0.509 -0.097 0.749 0 l 42.56 17.193 c 0.378 0.153 0.625 0.52 0.625 0.927 s -0.247 0.774 -0.625 0.927 l -42.56 17.194 C 45.254 36.363 45.127 36.387 45 36.387 z" style="fill: rgb(0,0,0);" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
	<path d="M 45 90 c -0.196 0 -0.392 -0.058 -0.559 -0.171 C 44.165 89.644 44 89.332 44 89 V 35.387 c 0 -0.408 0.248 -0.774 0.625 -0.927 l 42.559 -17.194 c 0.309 -0.124 0.657 -0.088 0.935 0.098 c 0.275 0.186 0.44 0.497 0.44 0.829 v 53.613 c 0 0.407 -0.247 0.774 -0.625 0.927 l -42.56 17.193 C 45.254 89.976 45.126 90 45 90 z M 46 36.062 v 51.456 l 40.56 -16.386 V 19.676 L 46 36.062 z" style="fill: rgb(0,0,0);" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
	<path d="M 45 90 c -0.126 0 -0.254 -0.024 -0.375 -0.073 L 2.066 72.733 c -0.378 -0.152 -0.625 -0.52 -0.625 -0.927 V 18.193 c 0 -0.333 0.165 -0.643 0.441 -0.829 c 0.275 -0.186 0.625 -0.223 0.934 -0.098 l 16.449 6.646 c 0.512 0.207 0.76 0.79 0.553 1.302 c -0.207 0.513 -0.789 0.759 -1.302 0.553 L 3.44 19.676 v 51.456 L 44 87.518 V 36.062 l -15.824 -6.393 c -0.512 -0.207 -0.76 -0.79 -0.553 -1.302 c 0.207 -0.511 0.791 -0.758 1.302 -0.553 l 16.45 6.646 C 45.752 34.613 46 34.979 46 35.387 V 89 c 0 0.332 -0.165 0.644 -0.441 0.829 C 45.392 89.942 45.196 90 45 90 z" style="fill: rgb(0,0,0);" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
	<path d="M 28.55 52.177 c -0.126 0 -0.254 -0.024 -0.375 -0.073 L 18.515 48.2 c -0.378 -0.152 -0.625 -0.52 -0.625 -0.927 V 24.839 c 0 -0.408 0.248 -0.774 0.625 -0.927 L 61.074 6.718 c 0.24 -0.097 0.51 -0.097 0.75 0 l 9.661 3.903 c 0.378 0.153 0.625 0.52 0.625 0.927 s -0.247 0.774 -0.625 0.927 L 29.55 29.416 v 21.761 c 0 0.332 -0.165 0.644 -0.441 0.829 C 28.942 52.119 28.747 52.177 28.55 52.177 z M 19.89 46.599 l 7.661 3.096 V 28.742 c 0 -0.408 0.248 -0.774 0.625 -0.927 L 68.44 11.548 l -6.991 -2.824 L 19.89 25.513 V 46.599 z" style="fill: rgb(0,0,0);" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
	<path d="M 52.542 78.351 c -0.396 0 -0.77 -0.236 -0.927 -0.625 c -0.207 -0.513 0.04 -1.096 0.552 -1.302 l 9.661 -3.902 c 0.513 -0.207 1.095 0.04 1.302 0.552 c 0.207 0.513 -0.04 1.096 -0.552 1.302 l -9.661 3.902 C 52.794 78.327 52.667 78.351 52.542 78.351 z" style="fill: rgb(0,0,0);" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
	<path d="M 52.542 72.119 c -0.396 0 -0.77 -0.236 -0.927 -0.625 c -0.207 -0.513 0.04 -1.096 0.552 -1.302 l 9.661 -3.903 c 0.513 -0.207 1.095 0.04 1.302 0.552 c 0.207 0.513 -0.04 1.096 -0.552 1.302 l -9.661 3.903 C 52.794 72.096 52.667 72.119 52.542 72.119 z" style="fill: rgb(0,0,0); " transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
	<path d="M 52.542 65.887 c -0.396 0 -0.77 -0.236 -0.927 -0.625 c -0.207 -0.513 0.04 -1.096 0.552 -1.302 l 9.661 -3.902 c 0.513 -0.207 1.095 0.04 1.302 0.552 c 0.207 0.513 -0.04 1.096 -0.552 1.302 l -9.661 3.902 C 52.794 65.863 52.667 65.887 52.542 65.887 z" style="fill: rgb(0,0,0);" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
</g>
</svg>
  
  ${p.shippingText || "Shipping charges applicable"}
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

