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
          <img src="/images/newsale/${im}.webp"
            onload="this.previousElementSibling.remove(); this.style.opacity=1"
            style="opacity:0"
            onclick="openLightbox(this.src)">
        </div>
      `;
    });
  }

  const message =
`Hi Diecast.scape,
I would like to book the ${p.name}.
Is it available?`;

  const whatsappText = encodeURIComponent(message);

  return `
  <div class="section">
    <div class="diorama-title">${p.name}</div>

    <div class="slider">
      ${imgs}
      ${p.sold ? `<div class="sold-badge">SOLD</div>` : ``}
    </div>

    <div class="price">
      <span class="new">₹${p.price}</span>
    </div>

    <div class="ship">+ Shipping charges applicable</div>

    <a class="buy-btn"
      href="https://wa.me/918792744018?text=${whatsappText}"
      target="_blank">
      Book Now
    </a>
  </div>
  `;
}

async function loadSaleProducts(){

  const container = document.getElementById("sale-main");
  const loader = document.getElementById("productsLoader");

  if(!container) return;

  // ===== SALE LIVE CHECK =====
  const ref = doc(db,"siteConfig","sale");
  const snap = await getDoc(ref);

  let live = false;
  let liveDate = "";

  if(snap.exists()){
    const cfg = snap.data();

    if(cfg.enabled === true){
      live = true;
    }

    if(cfg.start){
      const start = new Date(cfg.start);
      const now = new Date();

      liveDate = start.toLocaleString("en-IN",{
        dateStyle:"medium",
        timeStyle:"short"
      });

      if(now >= start){
        live = true;
      }
    }
  }

  // ===== NOT LIVE =====
  if(!live){

    if(loader){
      loader.remove();
    }

    container.innerHTML = `
    <div class="border-top">
      <div class="sale-off">
        <p>Sale will be live on<br><strong>${liveDate}</strong></p>
      </div>
      </div>
    `;
    return;
  }

  // ===== LOAD PRODUCTS =====
  const q = query(
    collection(db,"specialSaleProducts"),
    orderBy("created","desc")
  );

  const snap2 = await getDocs(q);

  let count = 0;

  snap2.forEach(doc=>{
    const p = doc.data();
    if(p.active === true){
      container.insertAdjacentHTML(
        "beforeend",
        buildSaleHTML(p)
      );
      count++;
    }
  });

  // ===== REMOVE LOADER AFTER DOM =====
  requestAnimationFrame(()=>{
    if(loader) loader.remove();
  });

  // ===== FALLBACK =====
  if(count === 0){
    container.innerHTML = `
    <div class="border-top">
      <div class="sale-off">
        <p>No products in this sale</p>
      </div>
      </div>
    `;
  }
}

window.addEventListener("DOMContentLoaded", loadSaleProducts);
