import { db } from "./firebase-init.js";

import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================================
// HERO SLIDER
// =====================================================

let currentHero = 0;

function showHero(index) {

  const slides =
    document.querySelectorAll(".hero-slide");

  const dots =
    document.querySelectorAll(".hero-dot");

  if (!slides.length) return;

  if (index >= slides.length) {
    currentHero = 0;
  }

  else if (index < 0) {
    currentHero = slides.length - 1;
  }

  else {
    currentHero = index;
  }


  slides.forEach((slide, i) => {

    slide.classList.toggle(
      "active",
      i === currentHero
    );

  });


  dots.forEach((dot, i) => {

    dot.classList.toggle(
      "active",
      i === currentHero
    );

  });

}


window.changeHero = function(direction) {

  showHero(
    currentHero + direction
  );

};


window.goHero = function(index) {

  showHero(index);

};


// Auto slide

setInterval(() => {

  showHero(currentHero + 1);

}, 6000);



// =====================================================
// POPULAR DIORAMA PRODUCTS
// =====================================================

async function loadPopularProducts() {

  const container =
    document.getElementById(
      "popularProducts"
    );

  if (!container) return;


  try {

    const q = query(

      collection(
        db,
        "products"
      ),

      orderBy(
        "created",
        "desc"
      ),

      limit(3)

    );


    const snap =
      await getDocs(q);


    container.innerHTML = "";


    let count = 0;


    snap.forEach(doc => {

      const p =
        doc.data();


      if (p.active !== true) {
        return;
      }


      p.id =
        doc.id;


      const image =
        getProductImage(p);


      const price =
        Number(
          p.priceNew ??
          p.price ??
          0
        );


      container.insertAdjacentHTML(

        "beforeend",

        `

        <article
          class="popular-card">


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
                :
                `
                  <div class="popular-no-image">
                    No Image
                  </div>
                `
            }

          </a>


          <div class="popular-info">

            <h3>
              ${escapeHTML(
                p.name || "Diorama"
              )}
            </h3>


            <div class="popular-price">

              ₹${price.toLocaleString("en-IN")}

            </div>


            <button
              class="popular-cart-btn"
              onclick="addPopularProduct(
                '${escapeAttribute(p.id)}',
                '${escapeAttribute(p.name || "Diorama")}',
                ${price}
              )">

              <span>
                🛒
              </span>

              Add to Cart

            </button>

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


    updateHomeCartCount();


  }

  catch(error) {

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

  if (
    Array.isArray(p.images) &&
    p.images.length
  ) {

    const first =
      p.images[0];


    if (
      typeof first === "string"
    ) {

      return `/images/diorama/${first}.webp`;

    }


    if (
      first &&
      typeof first === "object"
    ) {

      const image =
        first.full ||
        first.image ||
        first.name;


      if (image) {

        return `/images/diorama/${image}.webp`;

      }

    }

  }


  return "";

}



// =====================================================
// ADD TO CART
// =====================================================

window.addPopularProduct = function(
  id,
  name,
  price
) {

  if (
    typeof addProductInfo ===
    "function"
  ) {

    addProductInfo(
      id,
      name,
      price
    );

    updateHomeCartCount();

    return;

  }


  /*
   * Fallback main cart
   */

  const key =
    "diecastscape_cart";

  let cart =
    JSON.parse(
      localStorage.getItem(key)
    ) || {};


  if (cart[id]) {

    cart[id].qty++;

  }

  else {

    cart[id] = {

      id,
      name,
      price,
      qty: 1

    };

  }


  localStorage.setItem(
    key,
    JSON.stringify(cart)
  );


  updateHomeCartCount();

};



// =====================================================
// HOME CART COUNT
// =====================================================

function updateHomeCartCount() {

  const countElement =
    document.getElementById(
      "homeCartCount"
    );

  if (!countElement) return;


  let total = 0;


  /*
   * Main store cart
   */

  const mainCart =
    JSON.parse(
      localStorage.getItem(
        "diecastscape_cart"
      )
    ) || {};


  Object.values(mainCart)
    .forEach(item => {

      total +=
        Number(item.qty || 0);

    });


  /*
   * Accessories cart
   */

  const accessoryCart =
    JSON.parse(
      localStorage.getItem(
        "diecastscape_accessories_cart"
      )
    ) || {};


  Object.values(accessoryCart)
    .forEach(item => {

      total +=
        Number(item.qty || 0);

    });


  countElement.innerText =
    total > 99
      ? "99+"
      : total;

}



// =====================================================
// CART BUTTON
// =====================================================

window.openHomeCart = function() {

  /*
   * If your existing cart is available
   */

  if (
    typeof openCart ===
    "function"
  ) {

    openCart();
    return;

  }


  /*
   * Otherwise go to products
   */

  window.location.href =
    "/products/diorama/";

};



// =====================================================
// SEARCH
// =====================================================

window.openHomeSearch = function() {

  const search =
    document.getElementById(
      "homeSearch"
    );

  const input =
    document.getElementById(
      "homeSearchInput"
    );


  if (!search) return;


  search.classList.add(
    "show"
  );


  if (input) {

    setTimeout(() => {
      input.focus();
    }, 100);

  }

};



window.closeHomeSearch = function() {

  const search =
    document.getElementById(
      "homeSearch"
    );


  if (search) {

    search.classList.remove(
      "show"
    );

  }

};



window.homeSearchProducts =
function(value) {

  if (!value.trim()) return;


  /*
   * Send user to products search.
   *
   * This can later be connected
   * directly to your Firebase search.
   */

};



// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttribute(value) {

  return String(value)
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /'/g,
      "\\'"
    );

}



// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadPopularProducts();

    updateHomeCartCount();

  }
);

