
import { db } from "./firebase-init.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const PRODUCTS = "accessoriesProducts";

window.accessoryLiveStock = {};
window.accessoryStockReady = false;

let firstSnapshot = true;
let previousIds = new Set();

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

function getPackSize(code) {
  const match = String(code || "")
    .trim()
    .toUpperCase()
    .match(/(\d{2})$/);

  if (!match) return 1;

  const size = Number(match[1]);
  return Number.isInteger(size) && size > 0 ? size : 1;
}

function getAvailableSets(product) {
  const stock = Number(product?.stock);

  if (
    product?.stock === undefined ||
    product?.stock === null ||
    product?.stock === "" ||
    !Number.isFinite(stock) ||
    stock < 0
  ) {
    return 0;
  }

  return Math.floor(
    stock / getPackSize(product.productCode)
  );
}

function isOutOfStock(product) {
  return getAvailableSets(product) < 1;
}

window.getAccessoryAvailableSets = getAvailableSets;

function buildSaleHTML(p) {
  const images = Array.isArray(p.images) ? p.images : [];

  const productName = p.name || "";
  const quantityText = p.quantity || "";
  const subtitleText = p.subtitle || "";
  const price = Number(p.price) || 0;

  const outOfStock = isOutOfStock(p);

  const offerRibbon = `
    <div
      class="product-offer-ribbon2"
      ${outOfStock ? "" : "hidden"}
    >
      <span>Out of Stock</span>
    </div>
  `;

  const safeId = escapeHTML(p.id);
  const safeName = escapeHTML(productName);
  const safeQuantity = escapeHTML(quantityText);
  const safeSubtitle = escapeHTML(subtitleText);

  const cartId = escapeJS(p.id);
  const cartName = escapeJS(productName);
  const cartQuantity = escapeJS(quantityText);

  const cartProductCode = escapeJS(
    String(p.productCode || "").trim().toUpperCase()
  );

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
    ? `
      <div class="acc-image-dots">
        ${images.map((_, i) => `
          <span class="acc-image-dot ${i === 0 ? "active" : ""}"></span>
        `).join("")}
      </div>
    `
    : "";

  const addButton = `
    <button
      class="add-cart-btn ${outOfStock ? "out-of-stock-btn" : ""}"
      type="button"
      data-add-product="${safeId}"
      ${outOfStock ? "disabled" : ""}
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

  return `
    <div
      class="acc-card"
      data-accessory-product-id="${safeId}"
    >
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

function initAccessoryImageDots() {
  document.querySelectorAll(".acc-image-wrapper")
    .forEach(wrapper => {
      const slider = wrapper.querySelector(".acc-image-area");
      const dots = wrapper.querySelectorAll(".acc-image-dot");

      if (!slider || dots.length <= 1) return;

      // Prevent registering duplicate scroll listeners.
      if (slider.dataset.dotsInitialised === "true") return;
      slider.dataset.dotsInitialised = "true";

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

function updateProductStockUI(product) {
  const cards = document.querySelectorAll(
    "[data-accessory-product-id]"
  );

  const card = [...cards].find(
    element =>
      element.dataset.accessoryProductId === product.id
  );

  if (!card) return;

  const outOfStock = isOutOfStock(product);
  const ribbon = card.querySelector(".product-offer-ribbon2");
  const addButton = card.querySelector("[data-add-product]");

  if (ribbon) {
    ribbon.hidden = !outOfStock;
  }

  if (addButton) {
    addButton.disabled = outOfStock;
    addButton.classList.toggle(
      "out-of-stock-btn",
      outOfStock
    );
  }

  card.dataset.availableSets = String(
    getAvailableSets(product)
  );
}

function renderAllProducts(products) {
  const container = document.getElementById("sale-main");
  if (!container) return;

  container.innerHTML = "";

  products.forEach(product => {
    container.insertAdjacentHTML(
      "beforeend",
      buildSaleHTML(product)
    );
  });

  initAccessoryImageDots();

  if (typeof window.renderCart === "function") {
    window.renderCart();
  }
}

function handleLiveSnapshot(snapshot) {
  const products = [];

  snapshot.forEach(doc => {
    const product = {
      id: doc.id,
      ...doc.data()
    };

    if (product.active === true) {
      products.push(product);
      window.accessoryLiveStock[product.id] = product;
    } else {
      delete window.accessoryLiveStock[product.id];
    }
  });

  const currentIds = new Set(products.map(p => p.id));

  const membershipChanged =
    firstSnapshot ||
    currentIds.size !== previousIds.size ||
    [...currentIds].some(id => !previousIds.has(id));

  if (membershipChanged) {
    renderAllProducts(products);
  } else {
    // Update stock labels/buttons only. Do not rebuild cards,
    // so scrolling position in the image carousel is preserved.
    products.forEach(updateProductStockUI);
  }

  firstSnapshot = false;
  previousIds = currentIds;
  window.accessoryStockReady = true;

  const loader = document.getElementById("productsLoader");
  if (loader) loader.remove();

  document.dispatchEvent(
    new CustomEvent("accessory-stock-ready")
  );
}

function startLiveStockListener() {
  const productsQuery = query(
    collection(db, PRODUCTS),
    orderBy("created", "asc")
  );

  onSnapshot(
    productsQuery,
    handleLiveSnapshot,
    error => {
      console.error("Live accessory stock error:", error);

      window.accessoryStockReady = false;

      document.dispatchEvent(
        new CustomEvent("accessory-stock-error")
      );
    }
  );
}

// Explicit fresh fetch for checkout validation.
window.refreshAccessoryStockNow = async function () {
  const snapshot = await getDocs(
    collection(db, PRODUCTS)
  );

  snapshot.forEach(doc => {
    const product = {
      id: doc.id,
      ...doc.data()
    };

    if (product.active === true) {
      window.accessoryLiveStock[product.id] = product;
    } else {
      delete window.accessoryLiveStock[product.id];
    }
  });

  window.accessoryStockReady = true;
  return window.accessoryLiveStock;
};

window.addEventListener("DOMContentLoaded", () => {
  startLiveStockListener();
});
