
import { db } from "./firebase-init.js";

import {
  
  query,
  orderBy,
  onSnapshot
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

  const offerRibbon = `
    <div
      class="ds-card-stock-label"
      ${outOfStock ? "" : "hidden"}
    >
      OUT OF STOCK
    </div>
  `;

  const imgs = images.map(im => `
    <div class="ds-card-image-slide">
      <div class="ds-card-image-loader"></div>

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
  return `
    <article
      class="ds-card-product ${outOfStock ? "ds-card-sold-out" : ""}"
      data-accessory-product-id="${safeId}"
    >

      <div class="ds-card-image-wrap">

        <div class="ds-card-image-track">
          ${imgs}
        </div>

        ${offerRibbon}
        ${dots}

      </div>

      <div class="ds-card-details">

        <h3 class="ds-card-name">${safeName}</h3>

        ${
          quantityText
            ? `<div class="ds-card-pack">${safeQuantity}</div>`
            : ""
        }

        ${
          subtitleText
            ? `<div class="ds-card-subtitle">${safeSubtitle}</div>`
            : ""
        }

        <div class="ds-card-price-row">
          <span class="ds-card-price">₹${price}/-</span>
        </div>

        <div class="ds-card-cart-controls">

          <button
            class="ds-card-qty-button ds-card-minus"
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

          <button
            class="ds-card-qty-button ds-card-add"
            type="button"
            data-add-product="${safeId}"
            onclick="changeAccessoryQty(
              '${cartId}',
              '${cartName}',
              ${price},
              1,
              '${cartQuantity}',
              '${cartProductCode}'
            )"
            aria-label="Add ${safeName} to cart"
          >+</button>

        </div>

      </div>
    </article>
  `;
}

function initAccessoryImageDots() {
  document.querySelectorAll(".ds-card-image-wrap")
    .forEach(wrapper => {
      const slider = wrapper.querySelector(".ds-card-image-track");
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
  const ribbon = card.querySelector(".ds-card-stock-label");
const addButton = card.querySelector(".ds-card-add");

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
/* =========================================
   TEMPORARY ACCESSORIES COUNTDOWN
========================================= */

const ACCESSORIES_COUNTDOWN_END = new Date(
  "2026-11-01T00:00:00+05:30"
).getTime();


function updateAccessoriesCountdown() {
  const countdown = document.getElementById("accessoriesCountdown");
  if (!countdown) return;

  countdown.hidden = false;

  const finished = Date.now() >= ACCESSORIES_COUNTDOWN_END;
  const timer = countdown.querySelector(".countdown-timer");
  const date = countdown.querySelector(".countdown-date");
  const footer = countdown.querySelector(".countdown-bottom");
  const celebration = document.getElementById("countdownFinished");

  if (finished) {
    if (timer) timer.hidden = true;
    if (date) date.hidden = true;
    if (footer) footer.hidden = true;
    if (celebration) celebration.hidden = false;
    return;
  }

  if (timer) timer.hidden = false;
  if (date) date.hidden = false;
  if (footer) footer.hidden = false;
  if (celebration) celebration.hidden = true;

  const remaining = ACCESSORIES_COUNTDOWN_END - Date.now();

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  document.getElementById("countdownDays").textContent =
    String(days).padStart(2, "0");

  document.getElementById("countdownHours").textContent =
    String(hours).padStart(2, "0");

  document.getElementById("countdownMinutes").textContent =
    String(minutes).padStart(2, "0");

  document.getElementById("countdownSeconds").textContent =
    String(seconds).padStart(2, "0");
}


window.addEventListener("DOMContentLoaded", () => {
  updateAccessoriesCountdown();

  setInterval(updateAccessoriesCountdown, 1000);
});
