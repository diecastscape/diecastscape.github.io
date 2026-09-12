import { db } from "./firebase-init.js";

import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// BUILD ACCESSORY PRODUCT CARD
// ==========================================

function buildSaleHTML(p) {

  let imgs = "";


  // ==========================================
  // PRODUCT IMAGES
  // ==========================================

  if (Array.isArray(p.images)) {

    p.images.forEach(im => {

      imgs += `
        <div class="acc-img-box">

          <div class="acc-img-loader"></div>

          <img
            src="/images/frame/${im}.webp"
            alt="${p.name || ""}"
            loading="lazy"
            onload="
              this.previousElementSibling.remove();
              this.style.opacity='1';
            "
            style="opacity:0"
            onclick="openLightbox(this.src)"
          >

        </div>
      `;

    });

  }


  // ==========================================
  // PRODUCT NAME
  // ==========================================

  const productName =
    p.name || "";


  // ==========================================
  // FIREBASE QUANTITY
  // Example: Set of 5
  // ==========================================

  const quantityText =
    p.quantity || "";


  // ==========================================
  // SUBTITLE
  // ==========================================

  const subtitleText =
    p.subtitle || "";


  // ==========================================
  // PRODUCT CARD
  // ==========================================

  return `

    <div class="acc-card">


      <!-- PRODUCT NAME -->

      <div class="acc-name">
        ${productName}
      </div>


      <!-- FIREBASE QUANTITY -->

      ${
        quantityText
          ? `
            <div class="acc-quantity">
              ${quantityText}
            </div>
          `
          : ""
      }


      <!-- SUBTITLE -->

      ${
        subtitleText
          ? `
            <div class="acc-subtitle">
              ${subtitleText}
            </div>
          `
          : ""
      }


      <!-- PRODUCT IMAGE -->

      <div class="acc-image-area">

        ${imgs}

      </div>


      <!-- PRICE -->

      <div class="acc-price-row">

        <span class="acc-price">
          ₹${Number(p.price)}/-
        </span>

      </div>


      <!-- ======================================
           CART CONTROLS
      ======================================= -->

      <div class="cart-controls">


        <!-- MINUS -->

        <button
          class="maines-cart-btn"
          onclick="changeAccessoryQty(
            '${String(p.id).replace(/'/g, "\\'")}',
            '${String(p.name || "").replace(/'/g, "\\'")}',
            ${Number(p.price)},
            -1,
            '${String(p.quantity || "").replace(/'/g, "\\'")}'
          )"
        >
          −
        </button>


        <!-- QUANTITY -->

        <span
          class="qty"
          id="qty-${p.id}"
        >
          0
        </span>


        <!-- ADD -->

        <button
          class="add-cart-btn"
          onclick="changeAccessoryQty(
            '${String(p.id).replace(/'/g, "\\'")}',
            '${String(p.name || "").replace(/'/g, "\\'")}',
            ${Number(p.price)},
            1,
            '${String(p.quantity || "").replace(/'/g, "\\'")}'
          )"
        >
          Add
        </button>


      </div>


    </div>

  `;

}


// ==========================================
// LOAD ACCESSORIES FROM FIREBASE
// ==========================================

async function loadSaleProducts() {

  const container =
    document.getElementById(
      "sale-main"
    );

  const loader =
    document.getElementById(
      "productsLoader"
    );


  // ==========================================
  // SAFETY CHECK
  // ==========================================

  if (!container) {

    console.error(
      "Accessories container #sale-main not found."
    );

    return;

  }


  try {


    // ==========================================
    // FIREBASE QUERY
    // ==========================================

    const q = query(

      collection(
        db,
        "accessoriesProducts"
      ),

      orderBy(
        "created",
        "desc"
      )

    );


    // ==========================================
    // GET PRODUCTS
    // ==========================================

    const snap =
      await getDocs(q);


    let count = 0;


    // ==========================================
    // ADD PRODUCTS
    // ==========================================

    snap.forEach(doc => {

      const p =
        doc.data();


      // Firebase document ID

      p.id =
        doc.id;


      // Only active products

      if (
        p.active === true
      ) {

        container.insertAdjacentHTML(
          "beforeend",
          buildSaleHTML(p)
        );

        count++;

      }

    });


    // ==========================================
    // REMOVE LOADER
    // ==========================================

    requestAnimationFrame(() => {

      if (loader) {

        loader.remove();

      }

    });


    // ==========================================
    // RESTORE CART COUNTERS
    //
    // Not required because renderCart()
    // already updates .qty elements.
    // ==========================================

    if (
      typeof renderCart === "function"
    ) {

      renderCart();

    }


    // ==========================================
    // EMPTY PRODUCT STATE
    // ==========================================

    if (
      count === 0
    ) {

      container.innerHTML = `

        <div class="border-top">

          <div class="sale-off">

            <p>
              No products available
            </p>

          </div>

        </div>

      `;

    }


  }

  catch (error) {

    console.error(
      "Error loading accessories:",
      error
    );


    if (loader) {

      loader.remove();

    }


    container.insertAdjacentHTML(

      "beforeend",

      `

      <div class="sale-off">

        <p>
          Unable to load products.
          Please try again later.
        </p>

      </div>

      `

    );

  }

}


// ==========================================
// LOAD PRODUCTS WHEN PAGE IS READY
// ==========================================

window.addEventListener(
  "DOMContentLoaded",
  loadSaleProducts
);
