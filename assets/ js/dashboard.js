import { db } from "./firebase-init.js";

import { 
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  getDocs,
  orderBy,
  query,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const defaultDetails = `
  <p>
    This is a <strong>fully assembled, ready-to-display diorama</strong>,
    designed for collectors who value realism and craftsmanship.
  </p>
  <p>
    The diorama comes enclosed in a <strong>box-style display</strong> with
    <strong>built-in LED lighting</strong> and a
    <strong>clear acrylic front panel</strong> for enhanced presentation and protection.
  </p>
  <p>
    An <strong>external power adapter is included</strong>, ensuring quick and
    hassle-free setup.
  </p>
  <p><strong>Product Dimensions:</strong> 300 × 125 × 120 mm</p>
  <p>
    <strong>Note:</strong> Display models (cars) are
    <strong>not included</strong> and are shown for representation purposes only.
  </p>
`;

window.addEventListener("DOMContentLoaded", ()=>{
  const details = document.getElementById("p-details");
  if(details && !details.value){
    details.value = defaultDetails;
  }
});
window.addImageField = function(){
  const list = document.getElementById("imagesList");

  const div = document.createElement("div");

  div.innerHTML = `
    <input class="img-thumb" placeholder="Thumb path (products-temp)">
    <input class="img-full" placeholder="Full path (products)">
  `;

  list.appendChild(div);
};


// ===== SALE CONFIG =====
const saleRef = doc(db,"siteConfig","sale");

async function loadSaleConfig(){

  const snap = await getDoc(saleRef);
  if(!snap.exists()) return;

  const cfg = snap.data();

  document.getElementById("sale-enabled").checked =
    cfg.enabled || false;

  if(cfg.start){
    document.getElementById("sale-start").value =
      cfg.start.substring(0,16);
  }
}
window.saveSaleConfig = async function(){

  const btn = document.getElementById("saleSaveBtn");
  const loader = document.getElementById("saleSaveLoader");
  const msg = document.getElementById("sale-save-msg");

  if(btn.disabled) return;

  const enabled =
    document.getElementById("sale-enabled").checked;

  const start =
    document.getElementById("sale-start").value;

  msg.innerText = "";

  loader.classList.add("show");
  btn.disabled = true;

  try{

    await setDoc(saleRef,{
      enabled,
      start
    });

    loader.classList.remove("show");
    btn.disabled = false;

    msg.innerText = "Sale settings saved";

  }catch(e){

    loader.classList.remove("show");
    btn.disabled = false;

    msg.innerText = "Error saving settings";
  }
};

document.addEventListener("DOMContentLoaded", loadSaleConfig);

window.saveProduct = async function(){

  const loader = document.getElementById("saveLoader");
const btn = document.getElementById("saveBtn");
const msg = document.getElementById("saveMsg");

if(btn.disabled) return;

  const name = document.getElementById("p-name").value.trim();
  const priceOld = Number(document.getElementById("p-old").value);
  const priceNew = Number(document.getElementById("p-new").value);
  const detailsHTML = document.getElementById("p-details").value.trim();

  msg.innerText = "";

  // ---- VALIDATION ----
  if(!name){
    msg.innerText = "Enter product title";
    return;
  }

  if(!priceOld || !priceNew){
    msg.innerText = "Enter prices";
    return;
  }

  const thumbs = document.querySelectorAll(".img-thumb");
  const fulls = document.querySelectorAll(".img-full");

  const images = [];

  thumbs.forEach((t,i)=>{
    if(t.value && fulls[i].value){
      images.push({
        thumb: t.value.trim(),
        full: fulls[i].value.trim()
      });
    }
  });

  if(images.length === 0){
    msg.innerText = "Add at least 1 image";
    return;
  }

  // ---- SHOW LOADER ----
  loader.classList.add("show");
  btn.disabled = true;
try{
  await addDoc(collection(db,"products"),{
    name,
    priceOld,
    priceNew,
    detailsHTML,
    images,
    active:true,
    created:Date.now()
  });

  // ✅ STOP LOADER
  loader.classList.remove("show");
  btn.disabled = false;
  msg.innerText = "Saved successfully";

  // ✅ CLEAR FORM FIELDS
  document.getElementById("p-name").value = "";
  document.getElementById("p-old").value = "";
  document.getElementById("p-new").value = "";

  // reset details to default template
  document.getElementById("p-details").value = defaultDetails;

  // reset images
  const list = document.getElementById("imagesList");
  list.innerHTML = "";
  for(let i=0;i<4;i++) addImageField();

  }catch(e){
    loader.classList.remove("show");
    btn.disabled = false;
    msg.innerText = "Error saving";
  }
};

window.addEventListener("DOMContentLoaded", ()=>{
  const list = document.getElementById("imagesList");
  if(list && list.children.length===0){
    for(let i=0;i<4;i++) addImageField();
  }
});
window.openSection = function(type){

  document.querySelectorAll(".section-panel")
    .forEach(s=>s.style.display="none");

  const sec = document.getElementById("section-"+type);
  if(sec) sec.style.display="block";

  loadAdminProducts(type);
};
async function loadAdminProducts(type){

  let container;

  if(type==="special"){
    container = document.getElementById("specialProducts");
  }else if(type==="main"){
    container = document.getElementById("mainProducts");
  }

  if(!container) return;

  container.innerHTML = "Loading...";

  let col =
    type==="special"
      ? "specialSaleProducts"
      : "products";

  const snap = await getDocs(collection(db,col));

  container.innerHTML = "";

  snap.forEach(docSnap=>{

    const p = docSnap.data();
    const id = docSnap.id;

    if(type==="main"){
      container.insertAdjacentHTML("beforeend",`
        <div class="admin-product">
          <b>${p.name}</b>
          <span>₹${p.price}</span>

          <div class="admin-actions">
            <button onclick="editSaleProduct('${id}')">
              Edit
            </button>
            <button onclick="deleteSaleProduct('${id}')">
              Delete
            </button>
          </div>
        </div>
      `);
    }

  });

}
window.toggleAdd = function(type){
  const wrap = document.getElementById("add-"+type);
  wrap.style.display =
    wrap.style.display==="block" ? "none" : "block";
};

// ===== ADD SALE IMAGE FIELD =====
window.addSaleImageField = function(){
  const list = document.getElementById("s-imagesList");

  const div = document.createElement("div");

  div.innerHTML = `
    <input class="s-img-full" placeholder="Image path (newsale)">
  `;

  list.appendChild(div);
};

// ===== SAVE SALE PRODUCT =====
window.saveSaleProduct = async function(){

  const loader = document.getElementById("s-saveLoader");
  const btn = document.getElementById("s-saveBtn");
  const msg = document.getElementById("s-saveMsg");

  if(btn.disabled) return;

  const name = document.getElementById("s-name").value.trim();
  const price = Number(document.getElementById("s-price").value);

  msg.innerText = "";

  if(!name){
    msg.innerText = "Enter product title";
    return;
  }

  if(!price){
    msg.innerText = "Enter price";
    return;
  }

  const fulls = document.querySelectorAll(".s-img-full");
  const images = [];

  fulls.forEach(f=>{
    if(f.value){
      images.push(f.value.trim());
    }
  });

  if(images.length === 0){
    msg.innerText = "Add at least 1 image";
    return;
  }

  loader.classList.add("show");
  btn.disabled = true;

  try{
    await addDoc(collection(db,"specialSaleProducts"),{
      name,
      price,
      images,
      active:true,
      sold:false,
      created:Date.now()
    });

    loader.classList.remove("show");
    btn.disabled = false;
    msg.innerText = "Saved successfully";

    document.getElementById("s-name").value = "";
    document.getElementById("s-price").value = "";

    const list = document.getElementById("s-imagesList");
    list.innerHTML = "";
    for(let i=0;i<3;i++) addSaleImageField();

  }catch(e){
    loader.classList.remove("show");
    btn.disabled = false;
    msg.innerText = "Error saving";
  }
};

// INIT SALE IMAGE FIELDS
window.addEventListener("DOMContentLoaded", ()=>{
  const list = document.getElementById("s-imagesList");
  if(list && list.children.length===0){
    for(let i=0;i<3;i++) addSaleImageField();
  }
});
