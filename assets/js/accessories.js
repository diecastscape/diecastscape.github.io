/* =========================================
   ACCESSORIES CART
========================================= */


const CART_KEY = "diecastscape_accessories_cart";
const CART_VERSION_KEY = "diecastscape_accessories_cart_version";
const CART_UPDATED_KEY = "diecastscape_accessories_cart_updated_at";
const CART_VERSION = "2";
const CART_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const FREE_SHIPPING_LIMIT = 799;
const SHIPPING_CHARGE = 55;
const MIN_CART_VALUE = 199;

const WHATSAPP_NUMBER = "918792744018";
// One-time migration: clear carts saved by the old system.
if (localStorage.getItem(CART_VERSION_KEY) !== CART_VERSION) {
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(CART_UPDATED_KEY);
  localStorage.setItem(CART_VERSION_KEY, CART_VERSION);
}

// Expire saved carts after 30 days.
const savedCartTime = Number(
  localStorage.getItem(CART_UPDATED_KEY)
);

if (localStorage.getItem(CART_KEY)) {
  if (
    !Number.isFinite(savedCartTime) ||
    savedCartTime <= 0 ||
    Date.now() - savedCartTime >= CART_MAX_AGE
  ) {
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(CART_UPDATED_KEY);
  }
}

let cart = {};

try {
  cart = JSON.parse(localStorage.getItem(CART_KEY) || "{}");
  if (!cart || Array.isArray(cart) || typeof cart !== "object") {
    cart = {};
  }
} catch {
  cart = {};
}

function getCurrentAccessoryProduct(id) {
  return window.accessoryLiveStock?.[String(id)] || null;
}

function getCurrentAvailableSets(id) {
  const product = getCurrentAccessoryProduct(id);

  if (!product || !window.accessoryStockReady) {
    return 0;
  }

  return window.getAccessoryAvailableSets(product);
}


function canChangeCartQuantity(id, nextQty) {
  // Always allow customers to remove items.
  if (nextQty <= 0) return true;

  if (!window.accessoryStockReady) {
    showToast("Checking current stock. Please try again.");
    return false;
  }

  const product = getCurrentAccessoryProduct(id);

  if (!product) {
    showToast("Product stock is unavailable. Please try again.");
    return false;
  }

  const availableSets = getCurrentAvailableSets(id);

  if (nextQty > availableSets) {
    showToast(
      availableSets === 0
        ? "This product is out of stock."
        : `Only ${availableSets} set available.`
    );
    return false;
  }

  return true;
}


/* =========================================
   SAVE CART
========================================= */


function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));

  if (Object.keys(cart).length > 0) {
    localStorage.setItem(CART_UPDATED_KEY, String(Date.now()));
  } else {
    localStorage.removeItem(CART_UPDATED_KEY);
  }
}

/* =========================================
   GET CART PRODUCTS
========================================= */

function getCartProducts() {
  return Object.values(cart);
}



/* =========================================
   ADD PRODUCT INFO
========================================= */


function addProductInfo(
  id,
  name,
  price,
  quantityText = "",
  productCode = ""
) {
  const nextQty = cart[id] ? Number(cart[id].qty) + 1 : 1;

  if (!canChangeCartQuantity(id, nextQty)) return;

  if (!cart[id]) {
    cart[id] = {
      id,
      name,
      price: Number(price) || 0,
      qty: 1,
      quantityText: quantityText || "",
      productCode: productCode || ""
    };
  } else {
    cart[id].qty = nextQty;
    cart[id].quantityText = quantityText || cart[id].quantityText;
    cart[id].productCode = productCode || cart[id].productCode;
  }

  saveCart();
  renderCart();
  showToast("Added to cart");
}


/* =========================================
   CHANGE ACCESSORY QUANTITY
========================================= */



function changeAccessoryQty(
  id,
  name,
  price,
  change,
  quantityText = "",
  productCode = ""
) {
  const currentQty = cart[id]
    ? Number(cart[id].qty) || 0
    : 0;

  const nextQty = currentQty + Number(change);

  // Always allow reducing or removing a product,
  // even when live stock has decreased.
  if (Number(change) < 0) {
    if (nextQty <= 0) {
      delete cart[id];
    } else {
      cart[id].qty = nextQty;
    }

    saveCart();
    renderCart();
    return;
  }

  // Only check stock when increasing quantity.
  if (!canChangeCartQuantity(id, nextQty)) {
    return;
  }

  if (!cart[id]) {
    cart[id] = {
      id,
      name,
      price: Number(price) || 0,
      qty: 1,
      quantityText: quantityText || "",
      productCode: productCode || ""
    };
  } else {
    cart[id].qty = nextQty;
    cart[id].quantityText =
      quantityText || cart[id].quantityText;
    cart[id].productCode =
      productCode || cart[id].productCode;
  }

  saveCart();
  renderCart();
}
/* =========================================
   UPDATE ACCESSORY QUANTITY
========================================= */


function updateAccessoryQuantity(id) {
  if (!cart[id]) return;

  const qty = Math.floor(Number(cart[id].qty));

  if (!Number.isFinite(qty) || qty <= 0) {
    delete cart[id];
  } else {
    if (!canChangeCartQuantity(id, qty)) {
      cart[id].qty = 1;
    } else {
      cart[id].qty = qty;
    }
  }

  saveCart();
  renderCart();
}


/* =========================================
   REMOVE ITEM
========================================= */


function removeItem(id) {
  delete cart[id];

  saveCart();
  renderCart();

  // Immediately reset the quantity shown on the product card.
  const qtyElement = document.getElementById(`qty-${id}`);

  if (qtyElement) {
    qtyElement.textContent = "0";
  }
}

/* =========================================
   PRODUCT TOTAL
========================================= */

function getCartProductTotal() {

  return getCartProducts().reduce(
    (total, item) => {

      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;

      return total + (price * qty);

    },
    0
  );
}


/* =========================================
   TOTAL ITEMS
========================================= */

function getCartItemCount() {

  return getCartProducts().reduce(
    (total, item) => {

      return total + (
        Number(item.qty) || 0
      );

    },
    0
  );
}


/* =========================================
   SHIPPING
========================================= */

function getShipping(total) {

  if (total <= 0) {
    return 0;
  }

  if (total >= FREE_SHIPPING_LIMIT) {
    return 0;
  }

  return SHIPPING_CHARGE;
}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeCartHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================
   UPDATE BOTTOM CART BAR
========================================= */

function updateBottomCartBar(
  total,
  shipping,
  orderTotal,
  totalItems
) {

  const bottomTotal =
    document.getElementById("bottomTotal");

  const shippingPrice =
    document.getElementById("shippingPrice");

  const offerApply3 =
    document.getElementById("offerApply3");

  const grandTotal =
    document.getElementById("grandTotal");

  const offerCount =
    document.getElementById("offerCount");

  const offerText =
    document.getElementById("offerText");

  const progressFill =
    document.getElementById("offerProgressFill");


  if (bottomTotal) {
    bottomTotal.textContent =
      `₹${total}`;
  }


  if (grandTotal) {
    grandTotal.textContent =
      `₹${orderTotal}`;
  }


  if (shipping === 0 && total > 0) {

    if (offerApply3) {
      offerApply3.textContent =
        "FREE SHIPPING";
    }

    if (shippingPrice) {
      shippingPrice.textContent = "";
    }

  } else if (total > 0) {

    if (offerApply3) {
      offerApply3.textContent = "";
    }

    if (shippingPrice) {
      shippingPrice.textContent =
        `Shipping ₹${shipping}`;
    }

  } else {

    if (offerApply3) {
      offerApply3.textContent = "";
    }

    if (shippingPrice) {
      shippingPrice.textContent = "";
    }

  }


  if (offerCount) {

    if (totalItems <= 0) {

      offerCount.textContent =
        "Add products to your cart";

    } else {

      offerCount.textContent =
        `${totalItems} item${totalItems === 1 ? "" : "s"} in cart`;

    }

  }


  if (offerText) {

    if (total <= 0) {

      offerText.textContent =
        "Add more to unlock free shipping";

    } else if (total >= FREE_SHIPPING_LIMIT) {

      offerText.textContent =
        "🎉 Free shipping unlocked";

    } else {

      const remaining =
        FREE_SHIPPING_LIMIT - total;

      offerText.textContent =
        `Add ₹${remaining} more for free shipping`;

    }

  }


  if (progressFill) {

    const percentage =
      Math.min(
        (total / FREE_SHIPPING_LIMIT) * 100,
        100
      );

    progressFill.style.width =
      `${percentage}%`;

  }

}


/* =========================================
   RENDER CART POPUP PRODUCTS
========================================= */

function renderCartPopup() {

  const itemsContainer =
    document.getElementById("cartPopupItems");

  if (!itemsContainer) return;


  const products =
    getCartProducts();


  itemsContainer.innerHTML = "";


  products.forEach(item => {

    const price =
      Number(item.price) || 0;

    const qty =
      Number(item.qty) || 0;

    const subtotal =
      price * qty;


    const quantityText =
      item.quantityText ||
      "Quantity";


    const itemHTML = document.createElement("div");

    itemHTML.className =
      "cart-popup-item";


    itemHTML.innerHTML = `

      <div class="cart-popup-item-row">

        <div class="cart-popup-item-info">

          <div class="cart-popup-item-name">
            ${escapeCartHTML(item.name)}
          </div>

          <div class="cart-popup-item-quantity">
            ${escapeCartHTML(quantityText)}
            × ${qty} qty
          </div>

          <div class="cart-popup-item-price">
            ₹${price} × ${qty} = ₹${subtotal}
          </div>

        </div>

        <button
          type="button"
          class="cart-popup-remove"
          data-remove-id="${escapeCartHTML(item.id)}"
        >
          Remove
        </button>

      </div>

    `;


    itemsContainer.appendChild(itemHTML);

  });


  itemsContainer
    .querySelectorAll("[data-remove-id]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.getAttribute(
              "data-remove-id"
            );

          removeItem(id);

        }
      );

    });

}


/* =========================================
   RENDER CART
========================================= */




  
function renderCart() {
  const products = getCartProducts();

  const total = getCartProductTotal();
  const shipping = getShipping(total);
  const orderTotal = total + shipping;
  const totalItems = getCartItemCount();

  updateBottomCartBar(
    total,
    shipping,
    orderTotal,
    totalItems
  );

  renderCartPopup();

  const productTotalElement =
    document.getElementById("cartPopupProductTotal");

  const shippingElement =
    document.getElementById("cartPopupShipping");

  const grandTotalElement =
    document.getElementById("cartPopupGrandTotal");

  if (productTotalElement) {
    productTotalElement.textContent = `₹${total}`;
  }

  if (shippingElement) {
    shippingElement.textContent =
      shipping === 0 ? "FREE" : `₹${shipping}`;
  }

  if (grandTotalElement) {
    grandTotalElement.textContent = `₹${orderTotal}`;
  }

  const emptyBox =
    document.getElementById("cartPopupEmpty");

  const normalActions =
    document.getElementById("cartNormalActions");

  const checkoutSection =
    document.getElementById("cartCheckoutSection");

  if (products.length === 0) {
    if (emptyBox) {
      emptyBox.hidden = false;
    }

    if (normalActions) {
      normalActions.style.display = "none";
    }

    if (checkoutSection) {
      checkoutSection.hidden = true;
    }
  } else {
    if (emptyBox) {
      emptyBox.hidden = true;
    }

    if (normalActions) {
      const popup = document.getElementById("cartPopup");

      const checkoutMode =
        popup &&
        popup.dataset.checkoutMode === "true";

      normalActions.style.display =
        checkoutMode ? "none" : "flex";
    }
  }

  // Always update product-card counters,
  // even when the cart is completely empty.
  document.querySelectorAll(".ds-card-product").forEach(card => {
    const qtyElement = card.querySelector(".qty");
    if (!qtyElement) return;

    const id = card.dataset.accessoryProductId;
    const item = cart[id];

    qtyElement.textContent =
      String(Math.max(0, Number(item?.qty) || 0));
  });
}
/* =========================================
   OPEN CART POPUP
========================================= */

function openCartPopup() {

  const products =
    getCartProducts();


  if (products.length === 0) {

    showToast("Your cart is empty");

    return;
  }


  const popup =
    document.getElementById(
      "cartPopup"
    );

  const overlay =
    document.getElementById(
      "cartOverlay"
    );


  if (!popup) return;


  /*
    Always open in normal View Cart mode.
  */

  popup.dataset.checkoutMode =
    "false";


  const title =
    document.getElementById(
      "cartPopupTitle"
    );

  if (title) {
    title.textContent =
      "Your Cart";
  }


  const normalActions =
    document.getElementById(
      "cartNormalActions"
    );

  if (normalActions) {
    normalActions.style.display =
      "flex";
  }


  const checkoutSection =
    document.getElementById(
      "cartCheckoutSection"
    );

  if (checkoutSection) {
    checkoutSection.hidden = true;
  }


    /* SHOW OUTER OVERLAY */
  popup.classList.add("show");

  /* SHOW ACTUAL CART CARD */
  const cartCard =
    popup.querySelector(".cart-popup");

  if (cartCard) {
    cartCard.classList.add("show");
  }

  if (overlay) {
    overlay.classList.add("show");
  }

  popup.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "cart-popup-open"
  );


  renderCart();

}


/* =========================================
   CLOSE CART POPUP
========================================= */

function closeCartPopup() {

  const popup =
    document.getElementById(
      "cartPopup"
    );

  const overlay =
    document.getElementById(
      "cartOverlay"
    );


  if (popup) {

    /* HIDE OUTER OVERLAY */
    popup.classList.remove("show");

    /* HIDE ACTUAL CART CARD */
    const cartCard =
      popup.querySelector(".cart-popup");

    if (cartCard) {
      cartCard.classList.remove("show");
    }

    popup.setAttribute(
      "aria-hidden",
      "true"
    );

    popup.dataset.checkoutMode =
      "false";

  }


  if (overlay) {
    overlay.classList.remove("show");
  }


  document.body.classList.remove(
    "cart-popup-open"
  );

}


function updateExpectedDispatchEstimate() {
  const target = document.getElementById("expectedDispatchEstimate");
  if (!target) return;
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(0, 0, 0, 0);
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(candidate);
    day.setDate(candidate.getDate() + offset);
    if (day.getDay() !== 3 && day.getDay() !== 6) continue;
    const cutoff = new Date(day);
    cutoff.setDate(day.getDate() - 1);
    cutoff.setHours(12, 0, 0, 0);
    if (now <= cutoff) {
      target.textContent = "Expected dispatch: " + day.toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "short", year: "numeric"
      });
      return;
    }
  }
  target.textContent = "Expected dispatch: Next available Wednesday or Saturday";
}

/* =========================================
   ENTER CHECKOUT MODE
========================================= */

function checkoutCart() {

  const products =
    getCartProducts();

  const total =
    getCartProductTotal();


  if (products.length === 0) {

    showToast("Your cart is empty");

    return;
  }


  /*
    Minimum order validation.
  */

  if (total < MIN_CART_VALUE) {

    showToast(
      `Minimum order value is ₹${MIN_CART_VALUE}`
    );

    return;
  }


  const popup =
    document.getElementById(
      "cartPopup"
    );

  const title =
    document.getElementById(
      "cartPopupTitle"
    );

  const normalActions =
    document.getElementById(
      "cartNormalActions"
    );

  const checkoutSection =
    document.getElementById(
      "cartCheckoutSection"
    );


  if (!popup) return;


  /*
    SAME POPUP.
    No second popup is created.
  */

  popup.dataset.checkoutMode =
    "true";


  if (title) {
    title.textContent =
      "Checkout";
  }


  /*
    Hide Remove/Clear/Checkout
    normal cart actions.
  */

  if (normalActions) {
    normalActions.style.display =
      "none";
  }


  /*
    Show final checkout section.
  */

  if (checkoutSection) {
    checkoutSection.hidden = false;
  }


  updateExpectedDispatchEstimate();

  /*
    Re-render products without
    creating a new popup.
  */

  renderCheckoutProducts();


  /*
    Scroll popup to top.
  */

  const popupBox =
    popup.querySelector(
      ".cart-popup-box"
    );

  if (popupBox) {
    popupBox.scrollTop = 0;
  }

}


/* =========================================
   RENDER PRODUCTS IN CHECKOUT MODE
========================================= */

function renderCheckoutProducts() {

  const itemsContainer =
    document.getElementById(
      "cartPopupItems"
    );

  if (!itemsContainer) return;


  const products =
    getCartProducts();


  itemsContainer.innerHTML = "";


  products.forEach(item => {

    const price =
      Number(item.price) || 0;

    const qty =
      Number(item.qty) || 0;

    const subtotal =
      price * qty;

    const quantityText =
      item.quantityText ||
      "Quantity";


    const itemHTML =
      document.createElement("div");


    itemHTML.className =
      "cart-popup-item";


    /*
      IMPORTANT:
      No Remove button in checkout mode.
    */

    itemHTML.innerHTML = `

      <div class="cart-popup-item-row">

        <div class="cart-popup-item-info">

          <div class="cart-popup-item-name">
            ${escapeCartHTML(item.name)}
          </div>

          <div class="cart-popup-item-quantity">
            ${escapeCartHTML(quantityText)}
            × ${qty} qty
          </div>

          <div class="cart-popup-item-price">
            ₹${price} × ${qty} = ₹${subtotal}
          </div>

        </div>

      </div>

    `;


    itemsContainer.appendChild(
      itemHTML
    );

  });

}




/* =========================================
   FINAL WHATSAPP ORDER
========================================= */

    
async function proceedOrderWhatsApp() {
  const products = getCartProducts();
  if (!products.length) { showToast("Your cart is empty."); return; }
  const total = getCartProductTotal();
  if (total < MIN_CART_VALUE) { showToast(\`Minimum order value is ₹\${MIN_CART_VALUE}\`); return; }
  if (!window.accessoryStockReady) { showToast("Please wait while we check the latest stock."); return; }

  const encodedItems = [];
  for (const item of products) {
    const qty = Math.floor(Number(item.qty) || 0);
    const liveProduct = getCurrentAccessoryProduct(item.id);
    const productCode = String(liveProduct?.productCode || item.productCode || "").trim().toUpperCase();
    if (!liveProduct || !/^#[A-Z]{2}\d{2}$/.test(productCode)) {
      showToast("A product code is missing. Refresh the page and try again."); return;
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      showToast("Each product quantity must be between 1 and 99 sets."); return;
    }
    const available = getCurrentAvailableSets(item.id);
    if (qty > available) {
      showToast(available > 0 ? \`Only \${available} set(s) currently available for \${item.name}.\` : \`\${item.name} is currently out of stock.\`);
      return;
    }
    encodedItems.push({item, qty, productCode});
  }

  const shipping = getShipping(total);
  const orderTotal = total + shipping;
  const lines = [
    "Hello! I would like to place an order for these accessories.",
    "I prefer to order directly through WhatsApp rather than online payment.",
    "I will share my delivery details here in chat.",
    "",
    "ACCESSORIES"
  ];
  encodedItems.forEach(({item, qty, productCode}) => {
    const price = Number(item.price) || 0;
    const fullCode = productCode + String(qty).padStart(2, "0");
    lines.push(\`• \${item.name}\`);
    lines.push(\`  \${item.quantityText || "Set"} × \${qty} qty · \${fullCode}\`);
    lines.push(\`  ₹\${price} × \${qty} = ₹\${price * qty}\`);
  });
  lines.push("");
  lines.push(\`Product Total: ₹\${total}\`);
  lines.push(\`Shipping: \${shipping === 0 ? "FREE" : "₹" + shipping}\`);
  lines.push(\`Order Total: ₹\${orderTotal}\`);
  const whatsappURL = \`https://wa.me/\${WHATSAPP_NUMBER}?text=\${encodeURIComponent(lines.join("\\n"))}\`;
  const whatsappTab = window.open(whatsappURL, "_blank", "noopener,noreferrer");
  if (!whatsappTab) showToast("Please allow pop-ups to continue to WhatsApp.");
}
function clearCartDirectly() {

  cart = {};

  saveCart();

  /* Reset checkout mode */
  const cartPopup =
    document.getElementById("cartPopup");

  if (cartPopup) {
    cartPopup.dataset.checkoutMode = "false";
  }

  /* Update cart UI */
  renderCart();

  /* Close cart popup */
  closeCartPopup();

  /* Show normal toast */
  showToast("Cart cleared");
}
/* =========================================
   TOAST
========================================= */

let toastTimer = null;

function showToast(message) {

  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) return;


  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2500
    );

}


/* =========================================
   DOM READY
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {


    /* Bottom View Cart */

    const checkoutBtn =
      document.getElementById(
        "checkoutBtn"
      );

    if (checkoutBtn) {

      checkoutBtn.addEventListener(
        "click",
        openCartPopup
      );

    }


    /* Popup close */

    const closeBtn =
      document.getElementById(
        "cartPopupClose"
      );

    if (closeBtn) {

      closeBtn.addEventListener(
        "click",
        closeCartPopup
      );

    }


    /* Backdrop */

    const overlay =
      document.getElementById(
        "cartOverlay"
      );

    if (overlay) {

      overlay.addEventListener(
        "click",
        closeCartPopup
      );

    }


    /* Checkout */

    const popupCheckoutBtn =
      document.getElementById(
        "cartPopupCheckoutBtn"
      );

    if (popupCheckoutBtn) {

      popupCheckoutBtn.addEventListener(
        "click",
        checkoutCart
      );

    }


    /* Clear Cart */

    const clearCartBtn =
      document.getElementById(
        "clearCartBtn"
      );

    if (clearCartBtn) {

  clearCartBtn.addEventListener(
    "click",
    clearCartDirectly
  );

    }


    /* FINAL WHATSAPP ORDER */

    const finalWhatsAppBtn =
      document.getElementById(
        "finalWhatsAppBtn"
      );

    if (finalWhatsAppBtn) {

      finalWhatsAppBtn.addEventListener(
        "click",
        proceedOrderWhatsApp
      );

    }


    /* Escape key */

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape"
        ) {

          const popup =
            document.getElementById(
              "cartPopup"
            );

          if (
            popup &&
            popup.classList.contains("show")
          ) {

            closeCartPopup();

          }

        }

      }
    );


    /*
      Initial cart render.
    */

    renderCart();

  }
);
