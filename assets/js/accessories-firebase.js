import { db } from "./firebase-init.js";

import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function buildProductHTML(p) {
const imgs = `
<div class="img-box">
  <img src="/images/products/11.webp" style="width:100%">
</div>
`;

console.log(imgs);
  return `
  
    <div class="section">

      <div class="diorama-title">
        ${p.name}
      </div>

      <div class="slider">
        ${imgs}
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

  // ===== LOAD PRODUCTS DIRECTLY =====
  const q = query(
    collection(db,"accessories"),
    orderBy("created","desc")
  );

  const snap = await getDocs(q);

  let count = 0;

  snap.forEach(doc=>{

    const p = doc.data();

    if(p.active === true){

      container.insertAdjacentHTML(
        "beforeend",
        buildSaleHTML(p)
      );

      count++;
    }

  });

  // Remove loader
  requestAnimationFrame(()=>{
    if(loader) loader.remove();
  });

  // Empty state
  if(count===0){

    container.innerHTML=`
          <h2>No products available</h2>
    `;

  }

}

window.addEventListener(
  "DOMContentLoaded",
  loadProducts
);

