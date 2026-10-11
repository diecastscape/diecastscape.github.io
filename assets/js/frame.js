
/* =========================================
   FRAMES CART — UPDATED SYSTEM
========================================= */

const CART_KEY = "diecastscape_cart";
const WHATSAPP_NUMBER = "918792744018";

let cart = {};

try {
  cart = JSON.parse(localStorage.getItem(CART_KEY)) || {};
} catch (error) {
  console.error("Unable to load Frames cart:", error);
  cart = {};
}

let toastTimer = null;


/* =========================================
   SAVE / GET CART
========================================= */

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getCartProducts() {
  return Object.values(cart);
}

function getCartProductTotal() {
  return getCartProducts().reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0
  );
}

function getCartItemCount() {
  return getCartProducts().reduce(
    (sum, item) => sum + (Number(item.qty) || 0),
    0
  );
}


/* =========================================
   FRAME SHIPPING
   1–2 frames: ₹75
   3+ frames: FREE
========================================= */

function getShipping(count) {
  if (count <= 0) return 0;
  return count >= 3 ? 0 : 75;
}


/* =========================================
   FRAME DISCOUNT
   6+ frames: 20% OFF
========================================= */

function getFrameDiscount(productTotal, count) {
  return count >= 6 ? Math.round(productTotal * 0.20) : 0;
}


/* =========================================
   ADD PRODUCT
========================================= */

function addProductInfo(id, name, price) {
  if (!cart[id]) {
    cart[id] = {
      id: String(id),
      name: String(name),
      price: Number(price) || 0,
      qty: 1
    };
  } else {
    cart[id].qty = (Number(cart[id].qty) || 0) + 1;
  }

  saveCart();
  renderCart();
  updateFrameAddedStatus();
  showToast("Added to cart");
}


/* =========================================
   REMOVE ITEM
========================================= */

function removeItem(id) {
  if (!cart[id]) return;

  delete cart[id];

  saveCart();
  renderCart();
  updateFrameAddedStatus();
  showToast("Item removed");
}


/* =========================================
   FRAME PRODUCT ADDED STATUS
========================================= */

window.updateFrameAddedStatus = function () {
  let currentCart = {};

  try {
    currentCart = JSON.parse(localStorage.getItem(CART_KEY)) || {};
  } catch (error) {
    console.error("Unable to refresh Frames cart status:", error);
  }

  document.querySelectorAll(".acc-card").forEach(card => {
    const button = card.querySelector(".acc-cart-btn");
    const priceRow = card.querySelector(".acc-price-row");

    if (!button || !priceRow) return;

    const match = (button.getAttribute("onclick") || "").match(
      /addProductInfo\(\s*['"]([^'"]+)['"]/
    );

    if (!match) return;

    const productId = match[1];
    const existing = priceRow.querySelector(".acc-added");

    if (currentCart[productId]) {
      if (!existing) {
        priceRow.insertAdjacentHTML(
          "beforeend",
          '<span class="acc-added">Added ✓</span>'
        );
      }
    } else if (existing) {
      existing.remove();
    }
  });
};


window.showFrameAdded = function (productId) {
  updateFrameAddedStatus();
};


/* =========================================
   ESCAPE TEXT BEFORE HTML INSERTION
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
   RENDER PRODUCTS IN CART POPUP
========================================= */

function renderCartPopupProducts(checkoutMode = false) {
  const container = document.getElementById("cartPopupItems");
  if (!container) return;

  container.innerHTML = "";

  getCartProducts().forEach(item => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    const subtotal = price * qty;

    const element = document.createElement("div");
    element.className = "cart-popup-item";

    element.innerHTML = `
      <div class="cart-popup-item-row">
        <div class="cart-popup-item-info">

          <div class="cart-popup-item-name">
            ${escapeCartHTML(item.name)}
          </div>

          <div class="cart-popup-item-quantity">
            Frame × ${qty} qty
          </div>

          <div class="cart-popup-item-price">
            ₹${price} × ${qty} = ₹${subtotal}
          </div>

        </div>

        ${
          checkoutMode
            ? ""
            : `<button
                 type="button"
                 class="cart-popup-remove"
                 data-remove-id="${escapeCartHTML(item.id)}">
                 Remove
               </button>`
        }
      </div>
    `;

    container.appendChild(element);
  });

  container.querySelectorAll("[data-remove-id]").forEach(button => {
    button.addEventListener("click", () => {
      removeItem(button.getAttribute("data-remove-id"));
    });
  });
}


/* =========================================
   UPDATE OFFER BAR
========================================= */

function updateFrameOfferBar(count) {
  const offerCount = document.getElementById("offerCount");
  const offerText = document.getElementById("offerText");
  const progress = document.getElementById("offerProgressFill");

  if (!offerCount || !offerText || !progress) return;

  if (count <= 0) {
    offerCount.textContent = "Add frames to your cart";
    offerText.textContent = "Add 3 frames to unlock FREE SHIPPING";
    progress.style.width = "0%";
    return;
  }

  if (count < 3) {
    const remaining = 3 - count;

    offerCount.textContent = `${count} / 3 Frames`;
    offerText.textContent =
      `Add ${remaining} more frame${remaining === 1 ? "" : "s"} to unlock FREE SHIPPING`;

    progress.style.width = `${(count / 3) * 100}%`;
    return;
  }

  if (count < 6) {
    const remaining = 6 - count;

    offerCount.textContent = `${count} / 6 Frames`;
    offerText.textContent =
      `Free shipping unlocked! Add ${remaining} more frame${remaining === 1 ? "" : "s"} to get 20% OFF`;

    progress.style.width = `${(count / 6) * 100}%`;
    return;
  }

  offerCount.textContent = `${count} Frames`;
  offerText.textContent = "🎉 20% OFF + FREE SHIPPING unlocked";
  progress.style.width = "100%";
}


/* =========================================
   RENDER CART
========================================= */

function renderCart() {
  const products = getCartProducts();
  const count = getCartItemCount();
  const productTotal = getCartProductTotal();
  const shipping = getShipping(count);
  const discount = getFrameDiscount(productTotal, count);
  const orderTotal = productTotal + shipping - discount;

  const grandTotal = document.getElementById("grandTotal");
  const popupProductTotal = document.getElementById("cartPopupProductTotal");
  const popupShipping = document.getElementById("cartPopupShipping");
  const popupDiscount = document.getElementById("cartPopupDiscount");
  const popupGrandTotal = document.getElementById("cartPopupGrandTotal");

  if (grandTotal) grandTotal.textContent = `₹${orderTotal}`;
  if (popupProductTotal) popupProductTotal.textContent = `₹${productTotal}`;

  if (popupShipping) {
    popupShipping.textContent =
      count >= 3 ? "FREE" : `₹${shipping}`;
  }

  if (popupDiscount) {
    popupDiscount.textContent = discount > 0 ? `−₹${discount}` : "₹0";
  }

  if (popupGrandTotal) {
    popupGrandTotal.textContent = `₹${orderTotal}`;
  }

  updateFrameOfferBar(count);

  const popup = document.getElementById("cartPopup");
  const emptyBox = document.getElementById("cartPopupEmpty");
  const normalActions = document.getElementById("cartNormalActions");
  const checkoutSection = document.getElementById("cartCheckoutSection");

  const checkoutMode =
    popup && popup.dataset.checkoutMode === "true";

  if (emptyBox) emptyBox.hidden = products.length !== 0;

  if (normalActions) {
    normalActions.style.display =
      products.length === 0 || checkoutMode ? "none" : "flex";
  }

  if (checkoutSection && products.length === 0) {
    checkoutSection.hidden = true;

    if (popup) popup.dataset.checkoutMode = "false";
  }

  renderCartPopupProducts(checkoutMode && products.length > 0);
}


/* =========================================
   OPEN CART POPUP
========================================= */

function openCartPopup() {
  if (getCartProducts().length === 0) {
    showToast("Your cart is empty");
    return;
  }

  const popup = document.getElementById("cartPopup");
  const overlay = document.getElementById("cartOverlay");
  const title = document.getElementById("cartPopupTitle");
  const normalActions = document.getElementById("cartNormalActions");
  const checkoutSection = document.getElementById("cartCheckoutSection");

  if (!popup) return;

  popup.dataset.checkoutMode = "false";

  if (title) title.textContent = "Your Cart";
  if (normalActions) normalActions.style.display = "flex";
  if (checkoutSection) checkoutSection.hidden = true;

  popup.classList.add("show");
  popup.setAttribute("aria-hidden", "false");

  const card = popup.querySelector(".cart-popup");
  if (card) card.classList.add("show");

  if (overlay) overlay.classList.add("show");

  document.body.classList.add("cart-popup-open");

  renderCart();
}


/* =========================================
   CLOSE CART POPUP
========================================= */

function closeCartPopup() {
  const popup = document.getElementById("cartPopup");
  const overlay = document.getElementById("cartOverlay");

  if (popup) {
    popup.classList.remove("show");
    popup.setAttribute("aria-hidden", "true");
    popup.dataset.checkoutMode = "false";

    const card = popup.querySelector(".cart-popup");
    if (card) card.classList.remove("show");

    const checkoutSection = document.getElementById("cartCheckoutSection");
    const normalActions = document.getElementById("cartNormalActions");
    const title = document.getElementById("cartPopupTitle");

    if (checkoutSection) checkoutSection.hidden = true;
    if (normalActions) normalActions.style.display = "flex";
    if (title) title.textContent = "Your Cart";
  }

  if (overlay) overlay.classList.remove("show");

  document.body.classList.remove("cart-popup-open");
}


/* =========================================
   ENTER CHECKOUT MODE
========================================= */

function checkoutCart() {
  if (getCartProducts().length === 0) {
    showToast("Your cart is empty");
    return;
  }

  const popup = document.getElementById("cartPopup");
  const title = document.getElementById("cartPopupTitle");
  const normalActions = document.getElementById("cartNormalActions");
  const checkoutSection = document.getElementById("cartCheckoutSection");

  if (!popup || !checkoutSection) return;

  popup.dataset.checkoutMode = "true";

  if (title) title.textContent = "Checkout";
  if (normalActions) normalActions.style.display = "none";

  checkoutSection.hidden = false;

  renderCartPopupProducts(true);

  const popupBox = popup.querySelector(".cart-popup-box");
  if (popupBox) popupBox.scrollTop = 0;
}


/* =========================================
   FINAL WHATSAPP ORDER
========================================= */

function proceedOrderWhatsApp() {
  const products = getCartProducts();

  if (products.length === 0) {
    showToast("Your cart is empty");
    return;
  }

  const addressInput = document.getElementById("checkoutAddress");
  const pincodeInput = document.getElementById("checkoutPincode");
  const phoneInput = document.getElementById("checkoutPhone");

  const address = addressInput ? addressInput.value.trim() : "";
  const pincode = pincodeInput ? pincodeInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";

  if (!address) {
    showToast("Please enter your address");
    if (addressInput) addressInput.focus();
    return;
  }

  if (!/^\d{6}$/.test(pincode)) {
    showToast("Please enter a valid 6-digit pincode");
    if (pincodeInput) pincodeInput.focus();
    return;
  }

  if (!/^\d{10}$/.test(phone)) {
    showToast("Please enter a valid 10-digit phone number");
    if (phoneInput) phoneInput.focus();
    return;
  }

  const count = getCartItemCount();
  const productTotal = getCartProductTotal();
  const shipping = getShipping(count);
  const discount = getFrameDiscount(productTotal, count);
  const orderTotal = productTotal + shipping - discount;

  let message = "🖼️ *Frames Order - Diecast.scape*\n\n";

  products.forEach(item => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    const subtotal = price * qty;

    message += `• ${item.name}\n`;
    message += `₹${price} × ${qty} = ₹${subtotal}\n\n`;
  });

  message += "━━━━━━━━━━━━━━\n";
  message += `Total Frames : ${count}\n`;
  message += `Product Total : ₹${productTotal}\n`;
  message += `Shipping : ${shipping === 0 ? "FREE" : `₹${shipping}`}\n`;
  message += `Discount : −₹${discount}\n`;
  message += "━━━━━━━━━━━━━━\n";
  message += `*Order Total : ₹${orderTotal}*\n\n`;
  message += "*Delivery Details*\n";
  message += `Address : ${address}\n`;
  message += `Pincode : ${pincode}\n`;
  message += `Phone : ${phone}`;

  const whatsappURL =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  window.open(whatsappURL, "_blank");
}


/* =========================================
   CLEAR CART
========================================= */

function clearCartDirectly() {
  if (getCartProducts().length === 0) {
    showToast("Cart is already empty");
    return;
  }

  cart = {};
  saveCart();

  const popup = document.getElementById("cartPopup");
  if (popup) popup.dataset.checkoutMode = "false";

  renderCart();
  updateFrameAddedStatus();
  closeCartPopup();

  showToast("Cart cleared");
}


/* =========================================
   TOAST
========================================= */

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}


/* =========================================
   EVENT LISTENERS
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const checkoutBtn = document.getElementById("checkoutBtn");
  const closeBtn = document.getElementById("cartPopupClose");
  const overlay = document.getElementById("cartOverlay");
  const popupCheckoutBtn = document.getElementById("cartPopupCheckoutBtn");
  const clearCartBtn = document.getElementById("clearCartBtn");
  const finalWhatsAppBtn = document.getElementById("finalWhatsAppBtn");

  if (checkoutBtn) checkoutBtn.addEventListener("click", openCartPopup);
  if (closeBtn) closeBtn.addEventListener("click", closeCartPopup);
  if (overlay) overlay.addEventListener("click", closeCartPopup);
  if (popupCheckoutBtn) popupCheckoutBtn.addEventListener("click", checkoutCart);
  if (clearCartBtn) clearCartBtn.addEventListener("click", clearCartDirectly);
  if (finalWhatsAppBtn) {
    finalWhatsAppBtn.addEventListener("click", proceedOrderWhatsApp);
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      const popup = document.getElementById("cartPopup");
      if (popup && popup.classList.contains("show")) {
        closeCartPopup();
      }
    }
  });

  renderCart();
  updateFrameAddedStatus();
});
