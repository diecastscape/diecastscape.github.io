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

  const snap = await getDocs(collection(db, "accessories"));

  if (loader) loader.remove();

  container.innerHTML = "";

  snap.forEach(doc => {

    const p = doc.data();

    container.insertAdjacentHTML(
      "beforeend",
      buildProductHTML(p)
    );
console.log(container.innerHTML);
  });

}

window.addEventListener(
  "DOMContentLoaded",
  loadProducts
);

