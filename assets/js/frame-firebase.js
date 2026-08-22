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

function buildSaleHTML(p) {

  let imgs = "";

  if (Array.isArray(p.images)) {

    p.images.forEach(im => {

      imgs += `
        <div class="img-box1">

          <div class="img-loader"></div>

          <img
            src="/images/frames/${im}.webp"
            onload="this.previousElementSibling.remove(); this.style.opacity=1"
            style="opacity:0"
            onclick="openLightbox(this.src)"
          >

        </div>
      `;

    });

  }


  /* Check existing cart */

  const addedText = isProductInCart(p.id)
    ? `<span class="added-cart-text">Added ✔️</span>`
    : "";


  return `
    <div class="shop-card">

      <div class="diorama-title1">
        ${p.name}
      </div>

      <div class="slide">
        ${imgs}
      </div>

      <div class="price">

        <span class="new1">
          ₹${p.price}/-
        </span>

        ${addedText}

      </div>


      <!-- BUTTON REMAINS EXACTLY THE SAME -->

      <button
        class="add-cart-btn"
        onclick="
          addProductInfo(
            '${p.id}',
            '${p.name}',
            ${p.price}
          );
          showAddedStatus('${p.id}');
        "
      >
        Add to Cart
      </button>

    </div>
  `;
}


/* =========================================
   SHOW ADDED STATUS AFTER CLICK
========================================= */

window.showAddedStatus = function(productId) {

  const productCards =
    document.querySelectorAll(".shop-card");


  productCards.forEach(card => {

    const button =
      card.querySelector(".add-cart-btn");

    if (!button) return;


    /*
      Check the onclick attribute to identify
      the product ID of this card
    */

    if (
      button.getAttribute("onclick") &&
      button.getAttribute("onclick").includes(productId)
    ) {

      const price =
        card.querySelector(".price");

      if (!price) return;


      /* Don't add it twice */

      if (
        price.querySelector(".added-cart-text")
      ) {
        return;
      }


      price.insertAdjacentHTML(
        "beforeend",
        `<span class="added-cart-text">Added ✔️</span>`
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
