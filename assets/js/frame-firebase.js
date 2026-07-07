import { db } from "./firebase-init.js";
import { 
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function buildSaleHTML(p){

  let imgs = "";

  if(Array.isArray(p.images)){
    p.images.forEach(im=>{
      imgs += `
        <div class="img-box">
          <div class="img-loader"></div>
          <img src="/images/frames/${im}.webp"
            onload="this.previousElementSibling.remove(); this.style.opacity=1"
            style="opacity:0"
            onclick="openLightbox(this.src)">
        </div>
      `;
    });
  }

  return `
  <div class="section">

    <div class="diorama-title">${p.name}</div>

    <div class="slider">
      ${imgs}
    </div>

    <div class="price">
      <span class="new">₹${p.price}/-</span>
    </div>

    <button
      class="add-cart-btn"
      onclick="
        addProductInfo(
          '${p.id}',
          '${p.name}',
          ${p.price}
        );
        changeQty('${p.id}',1);
      ">
       Add to Cart
    </button>

  </div>
  `;
}

async function loadSaleProducts(){

  const container =
    document.getElementById("sale-main");

  const loader =
    document.getElementById("productsLoader");

  if(!container) return;

  // ===== LOAD PRODUCTS DIRECTLY =====
  const q = query(
    collection(db,"accessoriesProducts"),
    orderBy("created","desc")
  );

  const snap = await getDocs(q);

  let count = 0;

  snap.forEach(doc=>{

    const p = doc.data();
     p.id = doc.id;
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
restoreCart();
  // Empty state
  if(count===0){

    container.innerHTML=`
      <div class="border-top">
        <div class="sale-off">
          <p>No products available</p>
        </div>
      </div>
    `;

  }

}

window.addEventListener(
  "DOMContentLoaded",
  loadSaleProducts
);
