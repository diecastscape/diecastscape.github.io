import { db } from "./firebase-init.js";

import {
  collection,
 query,
 orderBy,
 getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function buildProductHTML(p) {

  const images = (p.images || []).map(img => `
    <div class="img-box">
      <div class="img-loader"></div>

      <img
        src="/images/accessories/${img}.webp"
        style="opacity:0"
        onload="this.previousElementSibling.remove();this.style.opacity=1"
        onclick="openLightbox(this.src)">
    </div>
  `).join("");

  return `

<div class="section"
data-name="${p.name}"
data-price="${p.price}">

<div class="diorama-title">
${p.name}
</div>

<div class="slider">
${images}
</div>

<div class="price">
<span class="new">₹${p.price}</span>
</div>

<div class="cart-controls">

<button
class="qty-btn"
onclick="
addProductInfo(
'${p.id}',
'${p.name}',
${p.price}
);
changeQty('${p.id}',-1);
">

−

</button>

<span
class="qty"
id="qty-${p.id}">
0
</span>

<button
class="qty-btn"
onclick="
addProductInfo(
'${p.id}',
'${p.name}',
${p.price}
);
changeQty('${p.id}',1);
">

+

</button>

</div>

</div>

`;

}

async function loadProducts() {

  const container =
    document.getElementById("productsContainer");

  const loader =
    document.getElementById("productsLoader");

  if (!container) return;

  try {

    const q = query(
      collection(db, "accessories"),
      orderBy("created", "desc")
    );

    const snap = await getDocs(q);

    let count = 0;

    snap.forEach(doc => {

      const p = doc.data();

      p.id = doc.id;

      if (p.active === true) {

        container.insertAdjacentHTML(
          "beforeend",
          buildProductHTML(p)
        );

        count++;

      }

    });

    if (loader) loader.remove();

    if (count === 0) {

      container.innerHTML = `
      <div class="border-top">
      <div class="sale-off">
      No accessories available
      </div>
      </div>
      `;

    }

    restoreCart();

  }

  catch (err) {

    console.error(err);

    if (loader) loader.remove();

    container.innerHTML = `
    <h2>${err.message}</h2>
    `;

  }

}

window.addEventListener(
  "DOMContentLoaded",
  loadProducts
);
