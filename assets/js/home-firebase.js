
import { db } from "./firebase-init.js";

import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================================
// LOAD TOP 3 DIORAMA PRODUCTS
// =====================================================

export async function loadPopularProducts() {

  const container = document.getElementById("popularProducts");

  if (!container) return;

  try {

    const q = query(
      collection(db, "products"),
      orderBy("created", "desc"),
      limit(3)
    );

    const snap = await getDocs(q);

    container.innerHTML = "";

    let count = 0;

    snap.forEach(doc => {

      const p = doc.data();

      if (p.active !== true) return;

      const image = getProductImage(p);

      const price = Number(
        p.priceNew ??
        p.price ??
        0
      );

      container.insertAdjacentHTML(
        "beforeend",
        `
        <article class="popular-card">

          <a
            href="/products/diorama/"
            class="popular-image">

            ${
              image
                ? `
                  <img
                    src="${image}"
                    alt="${escapeHTML(p.name || "Diorama")}"
                    loading="lazy">
                `
                : `
                  <div class="popular-no-image">
                    No Image
                  </div>
                `
            }

          </a>

          <div class="popular-info">

            <h3>
              ${escapeHTML(p.name || "Diorama")}
            </h3>

            ${
              p.subtitle
                ? `
                  <h5>
                    ${escapeHTML(p.subtitle)}
                  </h5>
                `
                : ""
            }

            <div class="popular-price">
              ₹${price.toLocaleString("en-IN")}
            </div>

          </div>

        </article>
        `
      );

      count++;

    });

    if (count === 0) {

      container.innerHTML = `
        <div class="popular-empty">
          No products available.
        </div>
      `;

    }

  } catch (error) {

    console.error(
      "Popular products error:",
      error
    );

    container.innerHTML = `
      <div class="popular-empty">
        Unable to load products.
      </div>
    `;

  }

}


// =====================================================
// PRODUCT IMAGE
// =====================================================

function getProductImage(p) {

  if (!Array.isArray(p.images) || !p.images.length) {
    return "";
  }

  const first = p.images[0];

  if (typeof first === "string") {
    return `/images/products/${first}.webp`;
  }

  if (first && typeof first === "object") {

    const image =
      first.full ||
      first.image ||
      first.name;

    if (image) {
      return `/images/products/${image}.webp`;
    }

  }

  return "";
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
