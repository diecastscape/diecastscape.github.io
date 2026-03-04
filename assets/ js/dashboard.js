import { db } from "./firebase-init.js";
import { 
  collection,
  updateDoc,
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
let editingId = null;
let editingType = null;
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
setTimeout(()=> msg.innerText="", 2500);
  }catch(e){

    loader.classList.remove("show");
    btn.disabled = false;

    msg.innerText = "Error saving settings";
  }
};

document.addEventListener("DOMContentLoaded", loadSaleConfig);
function showEditMode(){
  const bar = document.getElementById("editModeBar");
  if(bar) bar.style.display = "block";
}

function hideEditMode(){
  const bar = document.getElementById("editModeBar");
  if(bar) bar.style.display = "none";
}
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
  try {
if(editingId && editingType==="main"){

  await updateDoc(doc(db,"products",editingId),{
    name,
    priceOld,
    priceNew,
    detailsHTML,
    images
  });

}else{

  await addDoc(collection(db,"products"),{
    name,
    priceOld,
    priceNew,
    detailsHTML,
    images,
    active:true,
    created:Date.now()
  });

}

  // ✅ STOP LOADER
  loader.classList.remove("show");
  btn.disabled = false;
  msg.innerText = "Saved successfully";
editingId = null;
editingType = null;
hideEditMode();
document.getElementById("saveBtn").innerText = "Save Product";
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
setTimeout(()=> msg.innerText="", 3000);
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

  // hide all sections
  document.querySelectorAll(".section-panel")
    .forEach(s=>s.style.display="none");

  const sec = document.getElementById("section-"+type);
  if(!sec) return;

  // show section
  sec.style.display="block";

  // hide add form
  const addWrap = document.getElementById("add-"+type);
  if(addWrap) addWrap.style.display="none";

  // show products list
  const listBox =
    type==="main"
      ? document.getElementById("mainProducts")
      : document.getElementById("specialProducts");

  if(listBox){
    listBox.style.display="block";
    loadAdminProducts(type); // 🔥 AUTO LOAD
  }
};

window.toggleList = function(type){

  const addWrap = document.getElementById("add-"+type);

  // ✅ ALWAYS close add form if open
  if(addWrap) addWrap.style.display = "none";

  // ✅ reload products every click (refresh)
  loadAdminProducts(type);
};
async function loadAdminProducts(type){

  const container =
    type==="main"
      ? document.getElementById("mainProducts")
      : document.getElementById("specialProducts");

  const addWrap = document.getElementById("add-"+type);

  if(!container) return;

  // always close add form when loading list
  if(addWrap) addWrap.style.display = "none";

  container.style.display = "block";
  container.innerHTML = `
  <div class="product-list-loading">
    Loading products...
  </div>
`;

  const colName =
    type==="main" ? "products" : "specialSaleProducts";

  const q = query(
    collection(db, colName),
    orderBy("created","desc")
  );

  const snap = await getDocs(q);

  let html = "";

  snap.forEach(d=>{
    const p = d.data();
    const id = d.id;

    html += `
  <div class="admin-product">

    <div class="admin-title">
      ${p.name || "No name"}
    </div>

    <div class="admin-price">
      ${type==="main" ? `₹${p.priceNew}` : `₹${p.price}`}
    </div>

    ${type==="special" ? `
      <div style="margin:8px 0;">
        <label style="display:flex;align-items:center;gap:8px;">
         <label class="toggle-switch">
      <input type="checkbox"
            ${p.sold ? "checked" : ""}
            onchange="toggleSold('${id}', this.checked)">
      <span class="toggle-slider"></span>
      </div>
    ` : ``}

    <div class="admin-actions">
      <button onclick="editProduct('${type}','${id}')">
        Edit
      </button>
      <button onclick="deleteProduct('${type}','${id}')">
        Delete
      </button>
    </div>

  </div>
`;
  });

  if(html===""){
    html = `<p>No products</p>`;
  }

  container.innerHTML = html;
}

window.editProduct = async function(type, id){

  const colName =
    type==="main" ? "products" : "specialSaleProducts";

  const snap = await getDoc(doc(db,colName,id));
  if(!snap.exists()) return;

  const data = snap.data();

  editingId = id;
  editingType = type;
  showEditMode();

  // open add form
  toggleAdd(type);

  if(type==="main"){

    document.getElementById("p-name").value = data.name || "";
    document.getElementById("p-old").value = data.priceOld || "";
    document.getElementById("p-new").value = data.priceNew || "";
    document.getElementById("p-details").value = data.detailsHTML || "";

    const list = document.getElementById("imagesList");
    list.innerHTML = "";

    data.images.forEach(img=>{
      const div = document.createElement("div");
      div.innerHTML = `
        <input class="img-thumb" value="${img.thumb}">
        <input class="img-full" value="${img.full}">
      `;
      list.appendChild(div);
    });

    document.getElementById("saveBtn").innerText = "Update Product";

  }else{

    document.getElementById("s-name").value = data.name || "";
    document.getElementById("s-price").value = data.price || "";

    const list = document.getElementById("s-imagesList");
    list.innerHTML = "";

    data.images.forEach(img=>{
      const div = document.createElement("div");
      div.innerHTML = `
        <input class="s-img-full" value="${img}">
      `;
      list.appendChild(div);
    });

    document.getElementById("s-saveBtn").innerText = "Update Product";
  }
};
window.deleteProduct = async function(type,id){

  if(!confirm("Delete this product?")) return;

  const colName =
    type==="main" ? "products" : "specialSaleProducts";

  await deleteDoc(doc(db,colName,id));

  loadAdminProducts(type);
};
window.toggleSold = async function(id, status){

  await updateDoc(
    doc(db,"specialSaleProducts",id),
    { sold: status }
  );

  console.log("Sold status updated");
};
window.toggleAdd = function(type){

  const addWrap = document.getElementById("add-"+type);
  const listBox =
    type==="main"
      ? document.getElementById("mainProducts")
      : document.getElementById("specialProducts");

  if(!addWrap) return;

  const opening = addWrap.style.display !== "block";

  // If opening ADD manually → reset form
  if(opening){

    if(type==="main"){
      resetMainForm();
    }else{
      resetSaleForm();
    }
  }

  addWrap.style.display = opening ? "block" : "none";

  if(listBox){
    listBox.style.display = opening ? "none" : "block";
  }
};
function resetMainForm(){
  hideEditMode();
  editingId = null;
  editingType = null;

  document.getElementById("p-name").value = "";
  document.getElementById("p-old").value = "";
  document.getElementById("p-new").value = "";
  document.getElementById("p-details").value = defaultDetails;

  document.getElementById("saveBtn").innerText = "Save Product";

  const list = document.getElementById("imagesList");
  list.innerHTML = "";
  for(let i=0;i<4;i++) addImageField();
}
function resetSaleForm(){
  hideEditMode();
  editingId = null;
  editingType = null;

  document.getElementById("s-name").value = "";
  document.getElementById("s-price").value = "";

  document.getElementById("s-saveBtn").innerText = "Save Product";

  const list = document.getElementById("s-imagesList");
  list.innerHTML = "";
  for(let i=0;i<3;i++) addSaleImageField();
}
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
 try {
  if(editingId && editingType==="special"){

  await updateDoc(doc(db,"specialSaleProducts",editingId),{
    name,
    price,
    images
  });

}else{

  await addDoc(collection(db,"specialSaleProducts"),{
    name,
    price,
    images,
    active:true,
    sold:false,
    created:Date.now()
  });

}

    loader.classList.remove("show");
    btn.disabled = false;
    msg.innerText = "Saved successfully";
editingId = null;
editingType = null;
hideEditMode();
document.getElementById("s-saveBtn").innerText = "Save Product";
    document.getElementById("s-name").value = "";
    document.getElementById("s-price").value = "";

    const list = document.getElementById("s-imagesList");
    list.innerHTML = "";
    for(let i=0;i<3;i++) addSaleImageField();
setTimeout(()=> msg.innerText="", 3000);
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
