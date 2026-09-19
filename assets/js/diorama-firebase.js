import { db } from "./firebase-init.js";
import { collection, query, orderBy, getDocs } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

      function buildProductHTML(p) {

  const discount = Math.round(
    ((p.priceOld - p.priceNew) / p.priceOld) * 100
  );

  const save = p.priceOld - p.priceNew;


  // =========================================
  // OFFER RIBBON
  // Shows ONLY when Firebase has offerText
  // =========================================

  const offerRibbon =
    p.offerText && String(p.offerText).trim() !== ""
      ? `
	  <div class="product-offer-ribbon1">
          <span>${p.offerClime}</span>
        </div>
        <div class="product-offer-ribbon">
          <span>${p.offerText}</span>
        </div>
      `
      : "";


  // =========================================
  // IMAGES
  // =========================================

  const imgs = (p.images || []).map(im => `
    <div class="img-box">

      <div class="img-loader"></div>

      <img
        src="/images/products/${im.full}.webp"
        alt="${p.name}"
        loading="lazy"
        decoding="async"
		onload="this.previousElementSibling.remove()"
        onerror="this.parentElement.classList.add('img-error')"
        onclick="openLightbox(this.src)"
      >

    </div>
  `).join("");


  // =========================================
  // WHATSAPP
  // =========================================

  const message =
`Hi Diecast.scape,
I would like to place an order for the ${p.name} - ${p.subtitle},
priced at ₹${p.priceNew} (${discount}% discount).
Kindly let me know the payment details.`;

  const whatsappText = encodeURIComponent(message);


  // =========================================
  // PRODUCT CARD
  // =========================================

  return `
  <div class="section">

    
${offerRibbon}
    <div class="diorama-title">
      ${p.name}
    </div>

    ${p.subtitle ? `
      <div class="diorama-subtitle">
        ${p.subtitle}
      </div>
    ` : ''}
<div class="slider-wrap">

  <div class="offer-badge">
    📸 Real Product Images
  </div>

<div class="slider">
  ${imgs}
</div>

${
  (p.images || []).length > 1
    ? `
      <div class="image-dots">
        ${(p.images || []).map((_, i) => `
          <span class="image-dot ${i === 0 ? "active" : ""}"></span>
        `).join("")}
      </div>
    `
    : ""
}

</div>
    <div class="qs-box">

      <div class="qs-title">
        QUICK SPECS
      </div>

      <div class="qs-grid">

        ${p.dimensions ? `
        <div class="qs-item">
          <div class="qs-name">Dimensions</div>
          <div class="qs-value">${p.dimensions}</div>
        </div>
        ` : ''}

        ${p.flore ? `
        <div class="qs-item">
          <div class="qs-name">Floor Type</div>
          <div class="qs-value">${p.flore}</div>
        </div>
        ` : ''}

        ${p.suitableScale ? `
        <div class="qs-item">
          <div class="qs-name">Perfect Scale Model For</div>
          <div class="qs-value">${p.suitableScale}</div>
        </div>
        ` : ''}

        ${p.capacity ? `
        <div class="qs-item">
          <div class="qs-name">Capacity</div>
          <div class="qs-value">${p.capacity}</div>
        </div>
        ` : ''}

      </div>


      ${
        (
          p.accessories ||
          p.rotating ||
          p.lighting ||
	      p.lightingAdapter ||
		  p.cover ||
          p.build
        ) ? `

        <div class="qs-features">

          ${p.accessories ? `
          <div class="qs-feature">
            <span class="qs-dot"></span>
            ${p.accessories}
          </div>
          ` : ''}

          ${p.rotating ? `
          <div class="qs-feature">
            <span class="qs-dot"></span>
            ${p.rotating}
          </div>
          ` : ''}

          ${p.cover ? `
          <div class="qs-feature">
            <span class="qs-dot"></span>
            ${p.cover}
          </div>
          ` : ''}

          ${p.lighting ? `
          <div class="qs-feature">
            <span class="qs-dot"></span>
            ${p.lighting}
          </div>
          ` : ''}

          ${p.build ? `
          <div class="qs-feature">
            <span class="qs-dot"></span>
            ${p.build}
          </div>
          ` : ''}

          ${p.build ? `
          <div class="qs-feature">
            <span class="qs-dot"></span>
            ${p.lightingAdapter}
          </div>
         ` : ''}
        </div>

      ` : ''}

    </div>


    <div class="price-card">

      <div class="price-main">
        <span class="old">₹${p.priceOld}</span>
        <span class="new">₹${p.priceNew}</span>
      </div>

      <div class="discount-box">
        <div class="discount">
          ${discount}% OFF
        </div>

        <div class="save">
          Save ₹${save}
        </div>
      </div>

    </div>


    <div class="ship">

      <svg width="18" height="18" viewBox="0 0 256 256">
        <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
          <polygon points="28.55,28.74 45,35.39 45,89 2.44,71.81 2.44,38.43 2.44,18.19 18.89,24.84 18.89,24.84 18.89,47.27 28.55,51.18" fill="rgb(226,174,131)"/>
          <polygon points="87.56,18.19 45,35.39 28.55,28.74 71.11,11.55" fill="rgb(226,174,131)"/>
          <polygon points="61.45,7.64 18.89,24.84 2.44,18.19 45,1" fill="rgb(226,174,131)"/>
          <polyline points="45,35.39 45,89 87.56,71.81 87.56,38.43 87.56,18.19 45,35.39" fill="rgb(196,141,105)"/>
        </g>
      </svg>

      ${p.shippingText || "Shipping charges applicable"}

    </div>


    <div class="customize-row">

      <a
        class="buy-btn"
        href="https://wa.me/918792744018?text=${whatsappText}"
        target="_blank"
      >
        Order on WhatsApp
      </a>

      <a
        class="customize-btn"
        href="https://wa.me/918792744018?text=${encodeURIComponent(
          `Hi, I want to customize the "${p.name} - ${p.subtitle}".`
        )}"
        target="_blank"
      >
        Customize This
      </a>

    </div>

  </div>
  `;
	  }
function initImageDots() {

  document.querySelectorAll(".slider-wrap").forEach(wrap => {

    const slider = wrap.querySelector(".slider");
    const dots = wrap.querySelectorAll(".image-dot");
    const slides = slider?.querySelectorAll(".img-box");

    if (!slider || dots.length <= 1 || !slides?.length) return;

    function updateActiveDot() {

      const scrollLeft = slider.scrollLeft;

      let activeIndex = 0;
      let smallestDistance = Infinity;

      slides.forEach((slide, index) => {

        const distance = Math.abs(
          slide.offsetLeft - scrollLeft
        );

        if (distance < smallestDistance) {
          smallestDistance = distance;
          activeIndex = index;
        }

      });

      dots.forEach((dot, index) => {
        dot.classList.toggle(
          "active",
          index === activeIndex
        );
      });

    }

    slider.addEventListener(
      "scroll",
      updateActiveDot,
      { passive: true }
    );

    // Set first dot active
    updateActiveDot();

  });

}
// =====================================================
// PROGRESSIVE PRODUCT LOADING
// Loads 4 products at a time
// =====================================================

const PRODUCTS_PER_BATCH = 4;

let allProducts = [];
let loadedProductIndex = 0;
let isLoadingProducts = false;


// =====================================================
// LOAD NEXT 4 PRODUCTS
// =====================================================

function loadNextProducts() {

  if (isLoadingProducts) return;

  if (loadedProductIndex >= allProducts.length) {
    return;
  }

  isLoadingProducts = true;

  const container =
    document.getElementById("productsContainer");

  if (!container) {
    isLoadingProducts = false;
    return;
  }


  const nextProducts =
    allProducts.slice(
      loadedProductIndex,
      loadedProductIndex + PRODUCTS_PER_BATCH
    );


  nextProducts.forEach(p => {

    container.insertAdjacentHTML(
      "beforeend",
      buildProductHTML(p)
    );

  });


  loadedProductIndex += nextProducts.length;


  // Initialize sliders/dots for newly added products
  requestAnimationFrame(() => {

    initImageDots();

    isLoadingProducts = false;

  });

}


// =====================================================
// LOAD PRODUCT DATA
// =====================================================

async function loadProducts() {

  const container =
    document.getElementById("productsContainer");

  const loader =
    document.getElementById("productsLoader");

  if (!container) return;


  try {

    const q = query(
      collection(db, "products"),
      orderBy("created", "desc")
    );


    const snap = await getDocs(q);


    allProducts = [];


    snap.forEach(doc => {

      const p = doc.data();

      if (p.active) {
        allProducts.push(p);
      }

    });


    // Remove initial loader
    if (loader) {
      loader.remove();
    }


    // No products
    if (allProducts.length === 0) {

      if (loader) {
        loader.innerText =
          "No products available";
      }

      return;
    }


    // Load FIRST 4 products only
    loadNextProducts();


  } catch (error) {

    console.error(
      "Error loading products:",
      error
    );

    if (loader) {
      loader.innerText =
        "Unable to load products";
    }

  }

}


// =====================================================
// LOAD NEXT BATCH WHEN USER REACHES LAST PRODUCT
// =====================================================

function initProductBatchLoading() {

  const container =
    document.getElementById(
      "productsContainer"
    );

  if (!container) return;


  window.addEventListener(
    "scroll",
    () => {

      if (isLoadingProducts) return;

      const products =
        container.querySelectorAll(
          ".section"
        );


      if (!products.length) return;


      const lastProduct =
        products[products.length - 1];


      const rect =
        lastProduct.getBoundingClientRect();


      // Start loading next 4 when
      // the last product is close to viewport
      const nearBottom =
        rect.bottom <=
        window.innerHeight + 300;


      if (nearBottom) {

        loadNextProducts();

      }

    },
    { passive: true }
  );

}


// =====================================================
// START
// =====================================================

window.addEventListener(
  "DOMContentLoaded",
  () => {

    loadProducts();

    initProductBatchLoading();

  }
);
