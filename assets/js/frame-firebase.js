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

  // Test Firestore
  const snap = await getDocs(collection(db, "frameProduct"));

  console.log("Documents:", snap.size);

  snap.forEach(doc => {

    console.log(doc.id, doc.data());

    const p = doc.data();
    p.id = doc.id;

    container.insertAdjacentHTML(
      "beforeend",
      buildSaleHTML(p)
    );

  });

  if(loader) loader.remove();

}

window.addEventListener(
  "DOMContentLoaded",
  loadSaleProducts
);
