import { db } from "./firebase-init.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function loadAccessories() {

  const container = document.getElementById("productsContainer");
  const loader = document.getElementById("productsLoader");

  try {

    const snap = await getDocs(collection(db, "accessories"));

    if (loader) loader.remove();

    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = "<h2>No accessories available</h2>";
      return;
    }

    snap.forEach(doc => {

      const p = doc.data();

      if (p.active !== true) return;

      let images = "";

      (p.images || []).forEach(img => {
        images += `
          <img
            src="/images/accessories/${img}.webp"
            style="width:120px;border-radius:10px;margin:5px">
        `;
      });

      container.innerHTML += `
        <div class="section">

          <h2>${p.name}</h2>

          <div>${images}</div>

          <h3>₹${p.price}</h3>

        </div>
      `;

    });

  } catch (e) {

    console.error(e);

    if (loader) loader.remove();

    container.innerHTML =
      "<h2>" + e.message + "</h2>";

  }

}

loadAccessories();
