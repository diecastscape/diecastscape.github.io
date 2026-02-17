
import { auth } from "./firebase-init.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

window.adminLogin = function () {
  const email = document.getElementById("admin-email").value;
  const pass = document.getElementById("admin-password").value;
  const loader = document.getElementById("loginLoader");
  const btn = document.getElementById("loginBtn");

  loader.classList.add("show");
  btn.disabled = true;

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      window.location.href = "/admin/dashboard.html";
    })
    .catch(() => {
      loader.classList.remove("show");
      btn.disabled = false;
      document.getElementById("msg").innerText = "Invalid email or password";
    });
};

// ✅ AUTH STATE (NO BLINK FIX)
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;
  const body = document.body;

  // DASHBOARD → not logged → go login
  if (!user && path.includes("/admin/dashboard")) {
    window.location.replace("/admin/login.html");
    return;
  }

  // LOGIN → already logged → go dashboard
  if (user && path.includes("/admin/login")) {
    window.location.replace("/admin/dashboard.html");
    return;
  }

  // ✅ AUTH OK → show page
  body.classList.remove("auth-loading");
});


// ✅ LOGOUT
window.adminLogout = function () {
  const loader = document.getElementById("logoutLoader");
  const btn = document.getElementById("logoutBtn");

  if(loader){
    loader.classList.add("show");
    btn.disabled = true;
  }

  signOut(auth).then(() => {
    window.location.replace("/admin/login.html");
  });
};

const defaultDetails = `
<p>This is a <strong>fully assembled, ready-to-display diorama</strong>,
designed for collectors who value realism and craftsmanship.</p>

<p>The diorama comes enclosed in a <strong>box-style display</strong>
with <strong>built-in LED lighting</strong> and a
<strong>clear acrylic front panel</strong>.</p>

<p><strong>Product Dimensions:</strong> 300 × 125 × 120 mm</p>

<p><strong>Note:</strong> Display models (cars) are
<strong>not included</strong>.</p>
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
import { db } from "./firebase-init.js";
import { collection, addDoc } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.saveProduct = async function(){

  const loader = document.getElementById("saveLoader");
const btn = document.getElementById("saveBtn");
const msg = document.getElementById("saveMsg");

if(btn.disabled) return;

  const name = document.getElementById("p-name").value.trim();
  const priceOld = Number(document.getElementById("p-old").value);
  const priceNew = Number(document.getElementById("p-new").value);
  const detailsHTML = document.getElementById("p-details").value.trim();
  
  const loader = document.getElementById("saveLoader");
  const btn = document.getElementById("saveBtn");
  const msg = document.getElementById("saveMsg");

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
