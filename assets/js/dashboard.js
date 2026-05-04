import { db, auth } from "./firebase-init.js";
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
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut, onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let inactivityTimer;

onAuthStateChanged(auth, (user) => {
  if (user) {
    startTracking();
  }
});

function startTracking() {
  resetTimer();

  ["click","mousemove","keydown","scroll","touchstart"]
    .forEach(event => {
      window.addEventListener(event, resetTimer);
    });
}

function resetTimer() {
  clearTimeout(inactivityTimer);

  inactivityTimer = setTimeout(() => {
    autoLogout();
  }, 15 * 60 * 1000); // 15 min
}

function autoLogout() {
  alert("Session expired due to inactivity");

  signOut(auth).then(() => {
    window.location.replace("/admin/login.html");
  });
}

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
  const shippingText =
  document.getElementById("p-shipping").value.trim();
  const detailsHTML =
  document.getElementById("p-details").value.trim();
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
if(editingId){

  await updateDoc(doc(db,"products",editingId),{
    name,
    priceOld,
    priceNew,
    detailsHTML,
    shippingText,
    images
  });

}else{

  await addDoc(collection(db,"products"),{
    name,
    priceOld,
    priceNew,
    detailsHTML,
    shippingText,
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
  document.getElementById("p-shipping").value = "";
    
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

  const btn =
    type==="main"
      ? document.getElementById("mainAddBtn")
      : document.getElementById("specialAddBtn");

  if(addWrap) addWrap.style.display = "none";

  if(type==="main"){
    resetMainForm();
  }else{
    resetSaleForm();
  }

  btn.innerText = "+ Add";
  btn.classList.remove("cancel-btn");

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
<div class="admin-price-row">

  ${
  type==="main"
  ? `
    <div class="price-stack">
      <div class="admin-old-price">₹${p.priceOld || 0}</div>
      <div class="admin-price">₹${p.priceNew || 0}</div>
    </div>
  `
  : `
    <div class="admin-price">₹${p.price || 0}</div>
  `
  }

  ${type==="special" ? `
    <div class="sold-toggle">
      <label class="toggle-switch">
        <input type="checkbox"
          ${p.sold ? "checked" : ""}
          onchange="toggleSold('${id}', this.checked)">
        <span class="toggle-slider"></span>
      </label>

      <span class="sold-text">Sold</span>
    </div>
  ` : ``}

</div>

<div class="admin-shipping">
  Shipping: ${p.shippingText || "Shipping charges applicable"}
</div>
    <div class="admin-actions">
      <button onclick="editProduct('${type}','${id}')">
      <svg width="18" height="18" viewBox="0 0 256 256">
<g transform="translate(1.4066 1.4066) scale(2.81)">
<path d="M87.851 6.29 83.71 2.15C82.324.763 80.48 0 78.521 0c-1.961 0-3.804.763-5.19 2.15L67.15 8.331 22.822 52.658c-.074.074-.134.156-.194.238-.016.022-.036.04-.052.063-.087.13-.155.268-.208.411-.004.011-.012.019-.015.03l-6.486 18.178c-.26.728-.077 1.54.47 2.086.381.382.893.586 1.415.586.225 0 .452-.038.671-.116l18.177-6.485c.014-.005.025-.014.038-.019.142-.054.279-.12.406-.206.017-.012.031-.027.048-.039.088-.063.174-.128.251-.206l44.328-44.328 6.182-6.181c2.861-2.862 2.861-7.518 0-10.38zM21.051 68.948l4.006-11.226 3.61 3.611 3.61 3.611-11.226 4.004zM35.927 62.936l-1.445-1.445-7.418-7.419 41.499-41.499 8.863 8.863-41.499 41.5zM85.022 13.841l-4.768 4.767-8.863-8.863 4.767-4.767c1.26-1.263 3.46-1.263 4.724 0l4.141 4.14c1.301 1.302 1.301 3.421-.001 4.723z" fill="currentColor"/>
<path d="M79.388 45.667c-1.104 0-2 .896-2 2v34.804c0 1.946-1.584 3.529-3.53 3.529H7.53C5.583 86 4 84.417 4 82.471V16.142c0-1.946 1.583-3.53 3.53-3.53h34.803c1.104 0 2-.896 2-2s-.896-2-2-2H7.53C3.378 8.612 0 11.99 0 16.142v66.329C0 86.622 3.378 90 7.53 90h66.328c4.152 0 7.53-3.378 7.53-7.529V47.667c0-1.105-.896-2-2-2z" fill="currentColor"/>
</g>
</svg>
      </button>
      <button onclick="deleteProduct('${type}','${id}')">
        <svg width="18" height="18" viewBox="0 0 256 256">
<g transform="translate(1.4066 1.4066) scale(2.81)">
<path d="M66.911 90H23.089c-1.589 0-2.902-1.238-2.995-2.824l-3.69-63.018c-.048-.825.246-1.633.813-2.234.567-.601 1.356-.941 2.183-.941h51.201c.826 0 1.615.341 2.183.941.566.601.86 1.409.813 2.234l-3.689 63.018C69.813 88.762 68.5 90 66.911 90zM25.918 84h38.164l3.338-57.017H22.58L25.918 84z" fill="currentColor"/>
<path d="M75.977 26.983H14.023c-1.657 0-3-1.343-3-3v-3.869c0-5.645 4.592-10.237 10.237-10.237h47.479c5.645 0 10.237 4.592 10.237 10.237v3.869c0 1.657-1.343 3-3 3zM17.023 20.983h55.953v-.869c0-2.336-1.9-4.237-4.237-4.237H21.261c-2.336 0-4.237 1.901-4.237 4.237v.869z" fill="currentColor"/>
<path d="M56.913 15.876H33.086c-1.657 0-3-1.343-3-3C30.086 5.776 35.863 0 42.963 0h4.074c7.1 0 12.876 5.776 12.876 12.876 0 1.657-1.343 3-3 3zM36.776 9.876h16.448C52.107 7.584 49.754 6 47.037 6h-4.074C40.247 6 37.893 7.584 36.776 9.876z" fill="#currentColor"/>
<path d="M55.613 76.021c-.06 0-.118-.002-.179-.005-1.653-.097-2.916-1.517-2.819-3.171l2.146-36.658c.098-1.654 1.509-2.911 3.171-2.82 1.653.097 2.916 1.517 2.819 3.17l-2.146 36.659c-.093 1.594-1.416 2.825-2.992 2.825z" fill="currentColor"/>
<path d="M34.386 76.021c-1.577 0-2.898-1.23-2.992-2.824l-2.146-36.659c-.097-1.654 1.166-3.073 2.82-3.17 1.644-.088 3.073 1.166 3.17 2.82l2.146 36.658c.097 1.654-1.166 3.074-2.819 3.171-.06.002-.12.004-.179.004z" fill="currentColor"/>
<path d="M45 76.021c-1.657 0-3-1.343-3-3V36.362c0-1.657 1.343-3 3-3s3 1.343 3 3v36.658c0 1.658-1.343 3.001-3 3.001z" fill="#000"/>
</g>
</svg>
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
const btn =
  type==="main"
    ? document.getElementById("mainAddBtn")
    : document.getElementById("specialAddBtn");

btn.innerText = "Cancel";
btn.classList.add("cancel-btn");
  if(type==="main"){

    document.getElementById("p-name").value = data.name || "";
    document.getElementById("p-old").value = data.priceOld || "";
    document.getElementById("p-new").value = data.priceNew || "";
    document.getElementById("p-details").value = data.detailsHTML || "";
    document.getElementById("p-shipping").value =
  data.shippingText || "";
    
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
window.cancelEdit = function(type){

  editingId = null;
  editingType = null;

  hideEditMode();

  const addWrap = document.getElementById("add-"+type);

  const listBox =
    type==="main"
      ? document.getElementById("mainProducts")
      : document.getElementById("specialProducts");

  const btn =
    type==="main"
      ? document.getElementById("mainAddBtn")
      : document.getElementById("specialAddBtn");

  // close form
  if(addWrap) addWrap.style.display = "none";

  // show products
  if(listBox) listBox.style.display = "block";

  // reset add button
  btn.innerText = "+ Add";
  btn.classList.remove("cancel-btn");

  // reset form also
  if(type==="main"){
    resetMainForm();
  }else{
    resetSaleForm();
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

  const btn =
    type==="main"
      ? document.getElementById("mainAddBtn")
      : document.getElementById("specialAddBtn");

  if(!addWrap) return;

  const opening = addWrap.style.display !== "block";

  if(opening){

  // reset only when NOT editing
  if(!editingId){
    if(type==="main"){
      resetMainForm();
    }else{
      resetSaleForm();
    }
  }

    addWrap.style.display = "block";
    if(listBox) listBox.style.display = "none";

    btn.innerText = "Cancel";
    btn.classList.add("cancel-btn");

  }else{

    // close form + reset edit mode
    if(type==="main"){
      resetMainForm();
    }else{
      resetSaleForm();
    }

    addWrap.style.display = "none";
    if(listBox) listBox.style.display = "block";

    btn.innerText = "+ Add";
    btn.classList.remove("cancel-btn");
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
  document.getElementById("p-shipping").value = "";
  
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
if(editingId){

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
