
import { db } from "./firebase-init.js";

import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// HELPERS
// ==========================================

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJS(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

// ==========================================
// BUILD ACCESSORY PRODUCT CARD
// ==========================================

function buildSaleHTML(p) {
  const images = Array.isArray(p.images) ? p.images : [];

  const productName = p.name || "";
  const quantityText = p.quantity || "";
  const subtitleText = p.subtitle || "";
  const price = Number(p.price) || 0;

  // All stock data now comes from accessoriesProducts.
  const stockValue = Number(p.stock);
  const hasKnownStock =
    p.stock !== undefined &&
    p.stock !== null &&
    p.stock !== "" &&
    Number.isFinite(stockValue);

  // Missing stock does not automatically mean out of stock.
  const isOutOfStock =
    hasKnownStock && stockValue <= 0;

  const offerRibbon = isOutOfStock
    ? `<div class="product-offer-ribbon2">
         <span>Out of Stock</span>
       </div>`
    : "";

  const safeId = escapeHTML(p.id);
  const safeName = escapeHTML(productName);
  const safeQuantity = escapeHTML(quantityText);
  const safeSubtitle = escapeHTML(subtitleText);

  const cartId = escapeJS(p.id);
  const cartName = escapeJS(productName);
  const cartQuantity = escapeJS(quantityText);

  // Base code saved in Firestore, e.g. #TR05.
  const cartProductCode = escapeJS(
    String(p.productCode || "").trim().toUpperCase()
  );

  // ==========================================
  // PRODUCT IMAGES
  // ==========================================

  const imgs = images.map(im => `
    <div class="acc-img-box">
      <div class="acc-img-loader"></div>

      <img
        src="/images/accessories/${encodeURIComponent(String(im))}.webp"
        alt="${safeName}"
        loading="lazy"
        onload="this.previousElementSibling?.remove();this.style.opacity='1'"
        onerror="this.previousElementSibling?.remove();this.style.opacity='1'"
        style="opacity:0"
        onclick="openLightbox(this.src)"
      >
    </div>
  `).join("");

  const dots = images.length > 1
    ? `<div class="acc-image-dots">
        ${images.map((_, i) => `
          <span class="acc-image-dot ${i === 0 ? "active" : ""}"></span>
        `).join("")}
      </div>`
    : "";

  // ==========================================
  // ADD BUTTON
  // ==========================================

  const addButton = isOutOfStock
    ? `
      <button
        class="add-cart-btn out-of-stock-btn"
        type="button"
        onclick="showToast('This product is out of stock')"
        aria-disabled="true"
      >Add</button>
    `
    : `
      <button
        class="add-cart-btn"
        type="button"
        onclick="changeAccessoryQty(
          '${cartId}',
          '${cartName}',
          ${price},
          1,
          '${cartQuantity}',
          '${cartProductCode}'
        )"
      >Add</button>
    `;

  // ==========================================
  // COMPLETE PRODUCT CARD
  // ==========================================

  return `
    <div class="acc-card">
      ${offerRibbon}

      <div class="acc-name">${safeName}</div>

      ${quantityText
        ? `<div class="acc-quantity">${safeQuantity}</div>`
        : ""}

      ${subtitleText
        ? `<div class="acc-subtitle">${safeSubtitle}</div>`
        : ""}

      <div class="acc-image-wrapper">
        <div class="acc-image-area">${imgs}</div>
        ${dots}
      </div>

      <div class="acc-price-row">
        <span class="acc-price">₹${price}/-</span>
      </div>

      <div class="cart-controls">

        <button
          class="maines-cart-btn"
          type="button"
          onclick="changeAccessoryQty(
            '${cartId}',
            '${cartName}',
            ${price},
            -1,
            '${cartQuantity}',
            '${cartProductCode}'
          )"
          aria-label="Decrease ${safeName} quantity"
        >−</button>

        <span class="qty" id="qty-${safeId}">0</span>

        ${addButton}

      </div>
    </div>
  `;
}

// ==========================================
// ACCESSORY IMAGE DOTS
// ==========================================

function initAccessoryImageDots() {
  document.querySelectorAll(".acc-image-wrapper")
    .forEach(wrapper => {
      const slider = wrapper.querySelector(".acc-image-area");
      const dots = wrapper.querySelectorAll(".acc-image-dot");

      if (!slider || dots.length <= 1) return;

      slider.addEventListener("scroll", () => {
        const slideWidth = slider.clientWidth;

        if (!slideWidth) return;

        const index = Math.round(
          slider.scrollLeft / slideWidth
        );

        dots.forEach((dot, i) => {
          dot.classList.toggle("active", i === index);
        });
      }, { passive: true });
    });
}

// ==========================================
// LOAD ACCESSORIES FROM ONE COLLECTION
// ==========================================

async function loadSaleProducts() {
  const container = document.getElementById("sale-main");
  const loader = document.getElementById("productsLoader");

  if (!container) {
    console.error("Accessories container #sale-main not found.");
    return;
  }

  try {
    const productsQuery = query(
      collection(db, "accessoriesProducts"),
      orderBy("created", "asc")
    );

    // Only one Firestore collection is read.
    const productsSnap = await getDocs(productsQuery);

    const products = [];

    productsSnap.forEach(doc => {
      const product = {
        id: doc.id,
        ...doc.data()
      };

      if (product.active === true) {
        products.push(product);
      }
    });

    container.innerHTML = "";

    products.forEach(product => {
      container.insertAdjacentHTML(
        "beforeend",
        buildSaleHTML(product)
      );
    });

    if (loader) loader.remove();

    if (typeof renderCart === "function") {
      renderCart();
    }

    initAccessoryImageDots();

    if (products.length === 0) {
      container.innerHTML = `
        <div class="border-top">
          <div class="sale-off">
            <p>No products available</p>
          </div>
        </div>
      `;
    }

  } catch (error) {
    console.error("Error loading accessories:", error);

    if (loader) loader.remove();

    container.innerHTML = `
      <div class="sale-off">
        <p>Unable to load products. Please try again later.</p>
      </div>
    `;
  }
}

window.addEventListener(
  "DOMContentLoaded",
  loadSaleProducts
);
