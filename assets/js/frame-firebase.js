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

  const container = document.getElementById("sale-main");

  if(!container) return;

  container.innerHTML = buildSaleHTML({
    id:"1",
    name:"Test Frame",
    price:299,
    images:["911"]
  });

}

window.addEventListener(
  "DOMContentLoaded",
  loadSaleProducts
);
