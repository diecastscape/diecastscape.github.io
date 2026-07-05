import { db } from "./firebase-init.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function buildProductHTML(p) {

  const images = (p.images || []).map(img => `
    <div class="img-box">
      <img
        src="/images/products/${img}.webp"
        style="width:100%;"
        onclick="openLightbox(this.src)">
    </div>
  `).join("");

  return `
    <div class="section">

      <div class="diorama-title">
        ${p.name}
      </div>

      <div class="slider">
        ${images}
      </div>

      <div class="price">
        <span class="new">₹${p.price}</span>
      </div>

    </div>
  `;
}

async function loadProducts() {
const container = document.getElementById("productsContainer");
  const loader = document.getElementById("productsLoader");

  if(!container) return;

  const q = query(
    collection(db,"accessories"),
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
  
