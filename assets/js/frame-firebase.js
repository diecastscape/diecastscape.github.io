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

  return `
    <div class="section">
      <h2>${p.name}</h2>
      <p>₹${p.price}</p>
    </div>
  `;

}
async function loadSaleProducts(){

  const container =
    document.getElementById("sale-main");

  const loader =
    document.getElementById("productsLoader");

  if(!container) return;

  // Clear loader/content
  container.innerHTML = "";
const snap = await getDocs(collection(db, "frameProducts"));

alert("Documents: " + snap.size);

snap.forEach(doc => {

  alert(doc.data().name);

  container.innerHTML += `
    <div style="padding:20px;background:red;color:white;margin:10px;">
      ${doc.data().name}
    </div>
  `;

});

if(loader) loader.remove();


}

window.addEventListener(
  "DOMContentLoaded",
  loadSaleProducts
);
