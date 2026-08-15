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
        <div class="img-box2">

          <div class="img-loader"></div>

          <img
            src="/images/frame/${im}.webp"
            alt="${p.name}"
            onload="
              this.previousElementSibling.remove();
              this.style.opacity = 1;
            "
            style="opacity:0"
            onclick="openLightbox(this.src)"
          >

        </div>
      `;

    });

  }


  // ==========================================
  // PRODUCT CARD
  // ==========================================

  return `

  <div class="shop-card">

    <!-- Product Name -->

    <div class="diorama-title">

      ${p.name}

    </div>


    <!-- Image Slider -->

    <div class="slider1">
      ${imgs}
    </div>

    <!-- Price -->

    <div class="price">

      <span class="new1">

        ₹${p.price}/-

      </span>

    </div>

<!-- Quantity Controls -->

<div class="cart-controls">

  <button
    class="maines-cart-btn"
    onclick="changeAccessoryQty(
      '${p.id}',
      '${String(p.name).replace(/'/g, "\\'")}',
      ${Number(p.price)},
      -1
    )"
  >
    −
  </button>


  <span
    class="qty"
    id="qty-${p.id}"
  >
    0
  </span>


  <button
    class="add-cart-btn"
    onclick="changeAccessoryQty(
      '${p.id}',
      '${String(p.name).replace(/'/g, "\\'")}',
      ${Number(p.price)},
      1
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
    document.getElementById("sale-main");

  const loader =
    document.getElementById("productsLoader");


  // ==========================================
  // SAFETY CHECK
  // ==========================================

  if (!container) {
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


      // Add Firebase document ID

      p.id =
        doc.id;


      // Only show active products

      if (p.active === true) {

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


if (
  typeof restoreCart === "function"
) {

  restoreCart();

}


    // ==========================================
    // EMPTY PRODUCT STATE
    // ==========================================

    if (count === 0) {

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


  } catch (error) {


    // ==========================================
    // ERROR
    // ==========================================

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
    
