import { db } from "./firebase-init.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function loadProducts() {

  const container = document.getElementById("productsContainer");
  const loader = document.getElementById("productsLoader");

  if (!container) return;

  try {

    const snap = await getDocs(collection(db, "accessories"));

    if (loader) loader.remove();

    container.innerHTML = "";

    let count = 0;

    snap.forEach(doc => {

      const p = doc.data();

      if (p.active === true) {

        container.innerHTML += `
          <div class="section">
            <h2>${p.name}</h2>
            <p>₹${p.price}</p>
          </div>
        `;

        count++;
      }

    });

    if (count === 0) {
      container.innerHTML = "<h2>No accessories available</h2>";
    }

  } catch (err) {

    console.error(err);

    if (loader) loader.remove();

    container.innerHTML = `
      <h2>${err.message}</h2>
    `;

  }

}

window.addEventListener("DOMContentLoaded", loadProducts);
