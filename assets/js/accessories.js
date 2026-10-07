/* =========================================
   ACCESSORIES CART
========================================= */

const CART_KEY = "diecastscape_accessories_cart";

const FREE_SHIPPING_LIMIT = 900;
const SHIPPING_CHARGE = 75;
const MIN_CART_VALUE = 199;

const WHATSAPP_NUMBER = "918792744018";

let cart = JSON.parse(
  localStorage.getItem(CART_KEY)
) || {};


/* =========================================
   SAVE CART
========================================= */

function saveCart() {
  localStorage.setItem(
    CART_KEY,
    JSON.stringify(cart)
  );
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
  quantityText = ""
) {

  if (!cart[id]) {

    cart[id] = {
      id: id,
      name: name,
      price: Number(price) || 0,
      qty: 1,
      quantityText: quantityText || ""
    };

  } else {

    cart[id].qty += 1;

    if (quantityText) {
      cart[id].quantityText = quantityText;
    }

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
  quantityText = ""
) {

  if (!cart[id]) {

    if (change > 0) {
      addProductInfo(
        id,
        name,
        price,
        quantityText
      );
    }

    return;
  }

  cart[id].qty += change;

  if (quantityText) {
    cart[id].quantityText = quantityText;
  }

  if (cart[id].qty <= 0) {
    delete cart[id];
  }

  saveCart();

  renderCart();
}


/* =========================================
   UPDATE ACCESSORY QUANTITY
========================================= */

function updateAccessoryQuantity(id) {

  if (!cart[id]) return;

  const qty = Number(cart[id].qty);

  if (!Number.isFinite(qty) || qty <= 0) {
    delete cart[id];
  } else {
    cart[id].qty = Math.floor(qty);
  }

  saveCart();

  renderCart();
}


/* =========================================
   REMOVE ITEM
========================================= */

function removeItem(id) {

  if (!cart[id]) return;

  delete cart[id];

  saveCart();

  renderCart();

  showToast("Item removed");
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

  const products =
    getCartProducts();

  const total =
    getCartProductTotal();

  const shipping =
    getShipping(total);

  const orderTotal =
    total + shipping;

  const totalItems =
    getCartItemCount();


  updateBottomCartBar(
    total,
    shipping,
    orderTotal,
    totalItems
  );


  renderCartPopup();


  const productTotalElement =
    document.getElementById(
      "cartPopupProductTotal"
    );

  const shippingElement =
    document.getElementById(
      "cartPopupShipping"
    );

  const grandTotalElement =
    document.getElementById(
      "cartPopupGrandTotal"
    );


  if (productTotalElement) {
    productTotalElement.textContent =
      `₹${total}`;
  }


  if (shippingElement) {

    shippingElement.textContent =
      shipping === 0
        ? "FREE"
        : `₹${shipping}`;

  }


  if (grandTotalElement) {
    grandTotalElement.textContent =
      `₹${orderTotal}`;
  }


  const emptyBox =
    document.getElementById(
      "cartPopupEmpty"
    );

  const normalActions =
    document.getElementById(
      "cartNormalActions"
    );

  const checkoutSection =
    document.getElementById(
      "cartCheckoutSection"
    );


  if (products.length === 0) {

    if (emptyBox) {
      emptyBox.hidden = false;
    }

    if (normalActions) {
      normalActions.style.display =
        "none";
    }

    if (checkoutSection) {
      checkoutSection.hidden = true;
    }

  } else {

    if (emptyBox) {
      emptyBox.hidden = true;
    }

    /*
      Only show normal actions when
      checkout mode is NOT active.
    */

    if (normalActions) {

      const popup =
        document.getElementById(
          "cartPopup"
        );

      const checkoutMode =
        popup &&
        popup.dataset.checkoutMode === "true";

      normalActions.style.display =
        checkoutMode
          ? "none"
          : "flex";

    }

  }

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

function proceedOrderWhatsApp() {

  const products =
    getCartProducts();

  const total =
    getCartProductTotal();

  const shipping =
    getShipping(total);

  const orderTotal =
    total + shipping;


  /*
    Minimum order check.
  */

  if (products.length === 0) {

    showToast(
      "Your cart is empty"
    );

    return;
  }


  if (total < MIN_CART_VALUE) {

    showToast(
      `Minimum order value is ₹${MIN_CART_VALUE}`
    );

    return;
  }


  /*
    GET DELIVERY DETAILS
  */

  const addressInput =
    document.getElementById(
      "checkoutAddress"
    );

  const pincodeInput =
    document.getElementById(
      "checkoutPincode"
    );

  const phoneInput =
    document.getElementById(
      "checkoutPhone"
    );


  const address =
    addressInput
      ? addressInput.value.trim()
      : "";

  const pincode =
    pincodeInput
      ? pincodeInput.value.trim()
      : "";

  const phone =
    phoneInput
      ? phoneInput.value.trim()
      : "";


  /*
    VALIDATION
  */

  if (!address) {

    showToast(
      "Please enter your address"
    );

    if (addressInput) {
      addressInput.focus();
    }

    return;
  }


  if (!/^\d{6}$/.test(pincode)) {

    showToast(
      "Please enter a valid 6-digit pincode"
    );

    if (pincodeInput) {
      pincodeInput.focus();
    }

    return;
  }


  if (!/^\d{10}$/.test(phone)) {

    showToast(
      "Please enter a valid 10-digit phone number"
    );

    if (phoneInput) {
      phoneInput.focus();
    }

    return;
  }


  /* =========================================
     BUILD WHATSAPP MESSAGE
  ========================================= */

  let message =
    "🛒 *Accessories Order - Diecast.scape*\n\n";


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


    message +=
      `• ${item.name}\n`;

    message +=
      `${quantityText} × ${qty} qty\n`;

    message +=
      `₹${price} × ${qty} = ₹${subtotal}\n\n`;

  });


  message +=
    "━━━━━━━━━━━━━━\n";

  message +=
    `Product Total : ₹${total}\n`;

  message +=
    `Shipping : ${shipping === 0 ? "FREE" : `₹${shipping}`}\n`;

  message +=
    "━━━━━━━━━━━━━━\n";

  message +=
    `*Order Total : ₹${orderTotal}*\n\n`;

  message +=
    "*Delivery Details*\n";

  message +=
    `Address : ${address}\n`;

  message +=
    `Pincode : ${pincode}\n`;

  message +=
    `Phone : ${phone}`;


  /*
    DIRECT WHATSAPP REDIRECT.
    No confirmation popup.
  */

  const whatsappURL =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;


  window.open(
    whatsappURL,
    "_blank"
  );

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
