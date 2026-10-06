/* =====================================================
   ACCESSORIES CART
===================================================== */

const CART_KEY =
  "diecastscape_accessories_cart";

const FREE_SHIPPING_LIMIT =
  900;

const SHIPPING_CHARGE =
  75;

const MIN_CART_VALUE =
  199;

const WHATSAPP_NUMBER =
  "918792744018";


let cart =
  JSON.parse(
    localStorage.getItem(CART_KEY)
  ) || {};


/* =====================================================
   SAVE CART
===================================================== */

function saveCart() {

  localStorage.setItem(
    CART_KEY,
    JSON.stringify(cart)
  );

}


/* =====================================================
   GET CART PRODUCTS
===================================================== */

function getCartProducts() {

  return Object.values(cart);

}


/* =====================================================
   ADD PRODUCT
===================================================== */

function addProductInfo(
  id,
  name,
  price,
  quantityText = ""
) {

  if (cart[id]) {

    cart[id].qty += 1;

  } else {

    cart[id] = {

      id: id,

      name: name,

      price: Number(price),

      qty: 1,

      quantityText:
        quantityText || ""

    };

  }


  saveCart();

  renderCart();

  updateAccessoryQuantity(id);

  showToast(
    `${name} added to cart`
  );

}


/* =====================================================
   CHANGE QUANTITY
===================================================== */

function changeAccessoryQty(
  id,
  name,
  price,
  change,
  quantityText = ""
) {

  if (!cart[id]) {

    if (change > 0) {

      cart[id] = {

        id: id,

        name: name,

        price: Number(price),

        qty: 1,

        quantityText:
          quantityText || ""

      };

    }

  } else {

    cart[id].qty += change;


    if (cart[id].qty <= 0) {

      delete cart[id];

    }

  }


  saveCart();

  renderCart();

  updateAccessoryQuantity(id);

}


/* =====================================================
   UPDATE PRODUCT CARD QUANTITY
===================================================== */

function updateAccessoryQuantity(id) {

  const qtyElement =
    document.getElementById(
      `qty-${id}`
    );


  if (!qtyElement) {
    return;
  }


  qtyElement.textContent =
    cart[id]
      ? cart[id].qty
      : 0;

}


/* =====================================================
   REMOVE ITEM
===================================================== */

function removeItem(id) {

  if (!cart[id]) {
    return;
  }


  const productName =
    cart[id].name || "Item";


  delete cart[id];


  saveCart();

  renderCart();

  updateAccessoryQuantity(id);


  showToast(
    `${productName} removed from cart`
  );

}


/* =====================================================
   SHIPPING
===================================================== */

function getShipping(total) {

  if (total <= 0) {

    return 0;

  }


  if (
    total >=
    FREE_SHIPPING_LIMIT
  ) {

    return 0;

  }


  return SHIPPING_CHARGE;

}


/* =====================================================
   UPDATE BOTTOM CART BAR
===================================================== */

function updateBottomCartBar(
  total,
  shipping,
  orderTotal,
  totalItems
) {

  const bottomTotal =
    document.getElementById(
      "bottomTotal"
    );


  const offerCount =
    document.getElementById(
      "offerCount"
    );


  const offerText =
    document.getElementById(
      "offerText"
    );


  const offerApply =
    document.getElementById(
      "offerApply3"
    );


  const progressFill =
    document.getElementById(
      "offerProgressFill"
    );


  const checkoutBtn =
    document.getElementById(
      "checkoutBtn"
    );


  if (bottomTotal) {

    bottomTotal.textContent =
      `₹${orderTotal}`;

  }


  if (totalItems === 0) {

    if (offerCount) {

      offerCount.textContent =
        "Your cart is empty";

    }


    if (offerText) {

      offerText.textContent =
        `Free shipping on orders above ₹${FREE_SHIPPING_LIMIT}`;

    }


    if (offerApply) {

      offerApply.textContent = "";

    }


    if (progressFill) {

      progressFill.style.width =
        "0%";

    }


    if (checkoutBtn) {

      checkoutBtn.disabled =
        true;

    }


    return;

  }


  if (checkoutBtn) {

    checkoutBtn.disabled =
      false;

  }


  if (
    total >=
    FREE_SHIPPING_LIMIT
  ) {

    if (offerCount) {

      offerCount.textContent =
        "🎉 Free shipping unlocked";

    }


    if (offerText) {

      offerText.textContent =
        "You have unlocked free shipping";

    }


    if (offerApply) {

      offerApply.textContent =
        "FREE SHIPPING";

    }


    if (progressFill) {

      progressFill.style.width =
        "100%";

    }

  } else {

    const remaining =
      FREE_SHIPPING_LIMIT -
      total;


    const percentage =
      Math.min(
        (total /
          FREE_SHIPPING_LIMIT) *
          100,
        100
      );


    if (offerCount) {

      offerCount.textContent =
        `₹${remaining} more for free shipping`;

    }


    if (offerText) {

      offerText.textContent =
        `Free shipping above ₹${FREE_SHIPPING_LIMIT}`;

    }


    if (offerApply) {

      offerApply.textContent =
        `₹${remaining} to FREE`;

    }


    if (progressFill) {

      progressFill.style.width =
        `${percentage}%`;

    }

  }

}


/* =====================================================
   UPDATE CART POPUP
===================================================== */

function renderCartPopup() {

  const itemsContainer =
    document.getElementById(
      "cartPopupItems"
    );


  if (!itemsContainer) {
    return;
  }


  itemsContainer.innerHTML =
    "";


  const products =
    getCartProducts();


  let productTotal =
    0;


  if (
    products.length === 0
  ) {

    itemsContainer.innerHTML = `

      <div class="cart-popup-empty">

        Your cart is empty.

      </div>

    `;

  }


  products.forEach(item => {

    const price =
      Number(item.price || 0);

    const qty =
      Number(item.qty || 0);

    const subtotal =
      price * qty;


    productTotal +=
      subtotal;


    const quantityText =
      item.quantityText
        ? item.quantityText
        : "Qty";


    const itemElement =
      document.createElement(
        "div"
      );


    itemElement.className =
      "cart-popup-item";


    itemElement.innerHTML = `

      <div class="cart-popup-item-row">

        <div class="cart-popup-item-info">

          <div class="cart-popup-item-name">

            ${escapeCartHTML(
              item.name || ""
            )}

          </div>


          <div class="cart-popup-item-quantity">

            ${escapeCartHTML(
              quantityText
            )}
            × ${qty}

          </div>


          <button
            type="button"
            class="cart-popup-remove"
            data-remove-id="${escapeCartHTML(
              String(item.id)
            )}">

            Remove

          </button>

        </div>


        <div class="cart-popup-item-price">

          ₹${subtotal}

        </div>

      </div>

    `;


    itemsContainer.appendChild(
      itemElement
    );

  });


  const shipping =
    getShipping(productTotal);


  const orderTotal =
    productTotal +
    shipping;


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
      `₹${productTotal}`;

  }


  if (shippingElement) {

    shippingElement.textContent =
      shipping === 0
        ? "₹0"
        : `₹${shipping}`;

  }


  if (grandTotalElement) {

    grandTotalElement.textContent =
      `₹${orderTotal}`;

  }


  /*
   * Attach remove buttons
   */

  itemsContainer
    .querySelectorAll(
      "[data-remove-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset.removeId;

          removeItem(id);

        }
      );

    });

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeCartHTML(value) {

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


/* =====================================================
   RENDER CART
===================================================== */

function renderCart() {

  const products =
    getCartProducts();


  let productTotal =
    0;

  let totalItems =
    0;


  products.forEach(item => {

    const price =
      Number(item.price || 0);

    const qty =
      Number(item.qty || 0);


    productTotal +=
      price * qty;


    totalItems +=
      qty;

  });


  const shipping =
    getShipping(productTotal);


  const orderTotal =
    productTotal +
    shipping;


  updateBottomCartBar(
    productTotal,
    shipping,
    orderTotal,
    totalItems
  );


  renderCartPopup();


  /*
   * Update every visible
   * quantity on product cards.
   */

  Object.keys(cart)
    .forEach(id => {

      updateAccessoryQuantity(
        id
      );

    });

}


/* =====================================================
   OPEN CART POPUP
===================================================== */

function openCartPopup() {

  const popup =
    document.getElementById(
      "cartPopup"
    );


  const overlay =
    document.getElementById(
      "cartOverlay"
    );


  if (!popup) {
    return;
  }


  if (
    getCartProducts().length === 0
  ) {

    showToast(
      "Your cart is empty"
    );

    return;

  }


  renderCartPopup();


  popup.classList.add(
    "show"
  );


  if (overlay) {

    overlay.classList.add(
      "show"
    );

  }


  popup.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "cart-popup-open"
  );

}


/* =====================================================
   CLOSE CART POPUP
===================================================== */

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

    popup.classList.remove(
      "show"
    );


    popup.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  if (overlay) {

    overlay.classList.remove(
      "show"
    );

  }


  document.body.classList.remove(
    "cart-popup-open"
  );

}


/* =====================================================
   CHECKOUT DIRECTLY TO WHATSAPP
===================================================== */

function checkoutCart() {

  const products =
    getCartProducts();


  if (
    products.length === 0
  ) {

    showToast(
      "Your cart is empty"
    );

    return;

  }


  let productTotal =
    0;


  products.forEach(item => {

    productTotal +=
      Number(item.price || 0) *
      Number(item.qty || 0);

  });


  /*
   * Minimum cart value
   */

  if (
    productTotal <
    MIN_CART_VALUE
  ) {

    showToast(
      `Minimum cart value required is ₹${MIN_CART_VALUE}`
    );

    return;

  }


  const shipping =
    getShipping(productTotal);


  const orderTotal =
    productTotal +
    shipping;


  let message =
`Hi Diecast.scape,

I would like to place an order for:

`;


  products.forEach(item => {

    const price =
      Number(item.price || 0);

    const qty =
      Number(item.qty || 0);

    const subtotal =
      price * qty;


    const quantityText =
      item.quantityText
        ? item.quantityText
        : "Qty";


    message +=
`${item.name || ""}

${quantityText} × ${qty}
₹${price} × ${qty} = ₹${subtotal}

`;

  });


  message +=
`Product Total: ₹${productTotal}
Shipping: ₹${shipping}
Total: ₹${orderTotal}

I would like to proceed with my order.

Thank you.`;


  const whatsappURL =
    `https://wa.me/${WHATSAPP_NUMBER}?text=` +
    encodeURIComponent(
      message
    );


  /*
   * Close cart first.
   */

  closeCartPopup();


  /*
   * Direct WhatsApp redirect.
   * No confirmation popup.
   */

  window.open(
    whatsappURL,
    "_blank"
  );

}


/* =====================================================
   CLEAR CART CONFIRMATION
===================================================== */

function showClearCartPopup() {

  if (
    getCartProducts().length === 0
  ) {

    showToast(
      "Your cart is already empty"
    );

    return;

  }


  /*
   * Remove an already existing
   * confirmation popup.
   */

  const existing =
    document.getElementById(
      "clearCartConfirmPopup"
    );


  if (existing) {

    existing.remove();

  }


  const popup =
    document.createElement(
      "div"
    );


  popup.id =
    "clearCartConfirmPopup";


  popup.className =
    "whatsapp-redirect-overlay";


  popup.innerHTML = `

    <div class="whatsapp-redirect-box">

      <div class="whatsapp-redirect-icon">
        🛒
      </div>

      <h3>
        Clear Cart?
      </h3>

      <p>
        Are you sure you want to remove
        all products from your cart?
      </p>

      <div class="whatsapp-redirect-actions">

        <button
          type="button"
          class="whatsapp-cancel-btn"
          id="cancelClearCartBtn">

          Cancel

        </button>

        <button
          type="button"
          class="whatsapp-continue-btn"
          id="confirmClearCartBtn">

          Clear Cart

        </button>

      </div>

    </div>

  `;


  document.body.appendChild(
    popup
  );


  document.body.classList.add(
    "cart-popup-open"
  );


  const closeConfirmation =
    () => {

      popup.remove();

      document.body.classList.remove(
        "cart-popup-open"
      );

    };


  document
    .getElementById(
      "cancelClearCartBtn"
    )
    ?.addEventListener(
      "click",
      closeConfirmation
    );


  document
    .getElementById(
      "confirmClearCartBtn"
    )
    ?.addEventListener(
      "click",
      () => {

        cart = {};

        saveCart();

        renderCart();

        closeConfirmation();

        closeCartPopup();

        showToast(
          "Cart cleared"
        );

      }
    );


  popup.addEventListener(
    "click",
    event => {

      if (
        event.target === popup
      ) {

        closeConfirmation();

      }

    }
  );

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message) {

  const toast =
    document.getElementById(
      "toast"
    );


  if (!toast) {
    return;
  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toast._timer
  );


  toast._timer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2500
    );

}


/* =====================================================
   CART EVENTS
===================================================== */

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const viewCartButton =
      document.getElementById(
        "checkoutBtn"
      );


    const popupCheckoutButton =
      document.getElementById(
        "cartPopupCheckoutBtn"
      );


    const popupCloseButton =
      document.getElementById(
        "cartPopupClose"
      );


    const overlay =
      document.getElementById(
        "cartOverlay"
      );


    const clearCartButton =
      document.getElementById(
        "clearCartBtn"
      );


    /*
     * Bottom bar → View Cart
     */

    if (viewCartButton) {

      viewCartButton.addEventListener(
        "click",
        openCartPopup
      );

    }


    /*
     * Popup close
     */

    if (popupCloseButton) {

      popupCloseButton.addEventListener(
        "click",
        closeCartPopup
      );

    }


    /*
     * Click backdrop
     */

    if (overlay) {

      overlay.addEventListener(
        "click",
        closeCartPopup
      );

    }


    /*
     * Checkout → DIRECT WhatsApp
     */

    if (popupCheckoutButton) {

      popupCheckoutButton.addEventListener(
        "click",
        checkoutCart
      );

    }


    /*
     * Clear Cart
     */

    if (clearCartButton) {

      clearCartButton.addEventListener(
        "click",
        showClearCartPopup
      );

    }


    /*
     * ESC closes cart
     */

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape"
        ) {

          closeCartPopup();

        }

      }
    );


    /*
     * Initial render
     */

    renderCart();

  }
);
