
import { db } from "./firebase-init.js";

import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
function buildAccessoryHTML(p){
const imgs = (p.images || []).map(im => `
<div class="img-box">
  <div class="img-loader"></div>

  <img
    src="/images/accessories/${im}.webp"
    onload="this.previousElementSibling.remove();this.style.opacity=1"
    style="opacity:0"
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
${imgs}
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
changeQty('${p.id}',1);
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
onclick="changeQty('${p.id}',1)">

+

</button>

</div>

</div>

`;

}

async function loadAccessories() {

  try {

    const container = document.getElementById("productsContainer");
    const loader = document.getElementById("productsLoader");

    const snap = await getDocs(collection(db, "accessories"));

    alert("Documents found: " + snap.size);

    let count = 0;

    snap.forEach(doc => {

      alert(JSON.stringify(doc.data()));

      const p = doc.data();
      p.id = doc.id;

      container.insertAdjacentHTML(
        "beforeend",
        buildAccessoryHTML(p)
      );

      count++;

    });

    if (loader) loader.remove();

    if (count === 0) {
      container.innerHTML = "<h2>No accessories available</h2>";
    }

  } catch (e) {

    alert(e.message);

  }

}
