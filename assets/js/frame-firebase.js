import { db } from "./firebase-init.js";

import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CART_KEY = "diecastscape_cart";


/* =========================================
   CHECK IF PRODUCT IS ALREADY IN CART
========================================= */

function isProductInCart(productId) {

  try {

    const cart =
      JSON.parse(localStorage.getItem(CART_KEY)) || {};

    return !!cart[productId];

  } catch (error) {

    console.error("Cart read error:", error);
    return false;

  }

}


/* =========================================
   BUILD PRODUCT CARD
========================================= */

/* =========================================
   ACCESSORY PRODUCT CARD
========================================= */

function buildSaleHTML(p) {

  let imgs = "";

  if (Array.isArray(p.images)) {

    p.images.forEach(im => {

      imgs += `
        <div class="acc-img-box">

          <div class="acc-img-loader"></div>

          <img
            src="/images/frames/${im}.webp"
            alt="${p.name}"
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


  /* Check existing cart */

  const addedText = isProductInCart(p.id)
    ? `
      <span class="acc-added">
        Added ✓
      </span>
      `
    : "";


  return `

    <div class="acc-card">

      <!-- PRODUCT NAME -->

      <div class="acc-name">
        ${p.name}
      </div>


      <!-- PRODUCT IMAGE -->

      <div class="acc-image-area">

        ${imgs}

      </div>


      <!-- PRICE + STATUS -->

      <div class="acc-price-row">

        <span class="acc-price">
          ₹${p.price}/-
        </span>

        ${addedText}

      </div>


      <!-- CART BUTTON -->

      <button
        class="acc-cart-btn"
        onclick="
          addProductInfo(
            '${p.id}',
            '${p.name}',
            ${p.price}
          );
          showAccessoryAdded('${p.id}');
        "
      >
        <span class="acc-cart-plus">+</span>
        <span>Add to Cart</span>
      </button>

    </div>

  `;
}

/* =========================================
   SHOW ACCESSORY ADDED STATUS
========================================= */

window.showAccessoryAdded = function(productId) {

  const cards =
    document.querySelectorAll(".acc-card");


  cards.forEach(card => {

    const button =
      card.querySelector(".acc-cart-btn");

    if (!button) return;


    /*
      Identify product using existing Firebase ID
    */

    if (
      button.getAttribute("onclick") &&
      button.getAttribute("onclick").includes(productId)
    ) {

      const priceRow =
        card.querySelector(".acc-price-row");

      if (!priceRow) return;


      /* Don't add twice */

      if (
        priceRow.querySelector(".acc-added")
      ) {
        return;
      }


      priceRow.insertAdjacentHTML(
        "beforeend",
        `
        <span class="acc-added">
          Added ✓
        </span>
        `
      );

    }

  });

};
/* =========================================
   LOAD PRODUCTS
========================================= */

async function loadSaleProducts() {

  const container =
    document.getElementById("sale-main");

  const loader =
    document.getElementById("productsLoader");


  if (!container) return;


  const q = query(
    collection(db, "frameProducts"),
    orderBy("created", "desc")
  );


  const snap =
    await getDocs(q);


  let count = 0;


  snap.forEach(docSnap => {

    const p = docSnap.data();

    p.id = docSnap.id;


    if (p.active === true) {

      container.insertAdjacentHTML(
        "beforeend",
        buildSaleHTML(p)
      );

      count++;

    }

  });


  /* Remove loader */

  requestAnimationFrame(() => {

    if (loader) {
      loader.remove();
    }

  });


  /* Empty state */

  if (count === 0) {

    container.innerHTML = `
      <div class="border-top">

        <div class="sale-off">

          <p>No products available</p>

        </div>

      </div>
    `;

  }

}


/* =========================================
   START
========================================= */

window.addEventListener(
  "DOMContentLoaded",
  loadSaleProducts
);
