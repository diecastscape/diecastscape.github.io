// =====================================================
// ACCESSORIES CART SYSTEM
// =====================================================

const CART_KEY =
    "diecastscape_accessories_cart";

const FREE_SHIPPING_LIMIT = 900;

const MIN_CART_VALUE = 199;

let cart =
    JSON.parse(
        localStorage.getItem(CART_KEY)
    ) || {};



// =====================================================
// SAVE CART
// =====================================================

function saveCart() {

    localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
    );

}



// =====================================================
// GET CART PRODUCTS
// =====================================================

function getCartProducts() {

    return Object.values(cart);

}



// =====================================================
// ADD PRODUCT TO CART
// =====================================================

function addProductInfo(
    id,
    name,
    price,
    quantityText = ""
) {

    if (cart[id]) {

        cart[id].qty++;

        if (
            !cart[id].quantityText &&
            quantityText
        ) {

            cart[id].quantityText =
                quantityText;

        }

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

}



// =====================================================
// CHANGE ACCESSORY QUANTITY
// =====================================================

function changeAccessoryQty(
    id,
    name,
    price,
    change,
    quantityText = ""
) {

    // ==========================================
    // ADD
    // ==========================================

    if (change > 0) {

        if (cart[id]) {

            cart[id].qty++;

            if (
                !cart[id].quantityText &&
                quantityText
            ) {

                cart[id].quantityText =
                    quantityText;

            }

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

    }



    // ==========================================
    // REMOVE / DECREASE
    // ==========================================

    else if (change < 0) {

        if (cart[id]) {

            cart[id].qty--;

            if (cart[id].qty <= 0) {

                delete cart[id];

            }

        }

    }



    // ==========================================
    // SAVE
    // ==========================================

    saveCart();



    // ==========================================
    // UPDATE CART
    // ==========================================

    renderCart();

    updateAccessoryQuantity(id);

}



// =====================================================
// UPDATE PRODUCT QUANTITY DISPLAY
// =====================================================

function updateAccessoryQuantity(id) {

    const qtyElement =
        document.getElementById(
            `qty-${id}`
        );

    if (!qtyElement) return;



    const qty =
        cart[id]
            ? cart[id].qty
            : 0;



    qtyElement.innerText =
        qty;

}



// =====================================================
// REMOVE PRODUCT
// =====================================================

function removeItem(id) {

    delete cart[id];

    saveCart();

    renderCart();

    updateAccessoryQuantity(id);

}



// =====================================================
// ACCESSORIES SHIPPING
// =====================================================

function getShipping(total) {

    if (total <= 0) {

        return 0;

    }



    // ₹900 or more = FREE SHIPPING

    if (
        total >= FREE_SHIPPING_LIMIT
    ) {

        return 0;

    }



    // Below ₹900 = ₹75

    return 75;

}



// =====================================================
// UPDATE CART HANDLE TEXT
// =====================================================

function updateCartHandleText() {

    const cartHeader =
        document.getElementById(
            "cartHeader"
        );



    if (!cartHeader) return;



    const totalItems =
        getCartProducts().reduce(
            (sum, item) =>
                sum + Number(item.qty || 0),
            0
        );



    const cartIsOpen =
        document
            .getElementById("cartBox")
            ?.classList
            .contains("open");



    // -----------------------------------------
    // FIND TEXT ELEMENT
    // -----------------------------------------

    let textElement =
        cartHeader.querySelector(
            ".cart-handle-text"
        );



    // If no separate text element exists,
    // create one.

    if (!textElement) {

        textElement =
            document.createElement("span");

        textElement.className =
            "cart-handle-text";



        cartHeader.appendChild(
            textElement
        );

    }



    // -----------------------------------------
    // SET TEXT
    // -----------------------------------------

    if (cartIsOpen) {

        textElement.innerText =
            "Close Cart";

    }

    else {

        if (totalItems > 0) {

            textElement.innerText =
                `View Cart`;

        }

        else {

            textElement.innerText =
                "View Cart";

        }

    }

}



// =====================================================
// OPEN CART
// =====================================================

function openCart() {

    const cartBox =
        document.getElementById(
            "cartBox"
        );

    const cartOverlay =
        document.getElementById(
            "cartOverlay"
        );



    if (!cartBox) return;



    // -----------------------------------------
    // OPEN CART
    // -----------------------------------------

    cartBox.classList.add(
        "open"
    );



    // -----------------------------------------
    // SHOW OVERLAY
    // -----------------------------------------

    if (cartOverlay) {

        cartOverlay.classList.add(
            "show"
        );

    }



    // -----------------------------------------
    // LOCK BACKGROUND SCROLL
    // -----------------------------------------

    document.body.style.overflow =
        "hidden";



    // -----------------------------------------
    // UPDATE HANDLE TEXT
    // -----------------------------------------

    updateCartHandleText();

}



// =====================================================
// CLOSE CART
// =====================================================

function closeCart() {

    const cartBox =
        document.getElementById(
            "cartBox"
        );

    const cartOverlay =
        document.getElementById(
            "cartOverlay"
        );



    // -----------------------------------------
    // CLOSE CART BOX
    // -----------------------------------------

    if (cartBox) {

        cartBox.classList.remove(
            "open"
        );

    }



    // -----------------------------------------
    // REMOVE OVERLAY
    // -----------------------------------------

    if (cartOverlay) {

        cartOverlay.classList.remove(
            "show"
        );



        // Make absolutely sure the overlay
        // cannot block the page.

        cartOverlay.style.pointerEvents =
            "none";

    }



    // -----------------------------------------
    // RESTORE BACKGROUND
    // -----------------------------------------

    document.body.style.overflow =
        "";



    document.body.classList.remove(
        "cart-open"
    );



    // -----------------------------------------
    // UPDATE HANDLE TEXT
    // -----------------------------------------

    updateCartHandleText();

}



// =====================================================
// RENDER CART
// =====================================================

function renderCart() {

    const list =
        document.getElementById(
            "cartItems"
        );

    if (!list) return;



    list.innerHTML = "";



    let total = 0;



    // =================================================
    // CART ITEMS
    // =================================================

    getCartProducts().forEach(
        item => {

            const subTotal =
                Number(item.price) *
                Number(item.qty);



            total += subTotal;



            const setText =
                item.quantityText
                    ? item.quantityText
                    : "";



            list.innerHTML += `

            <div class="cart-item">

                <div class="cart-row">

                    <div class="cart-name">

                        ${item.name}

                    </div>

                    <div class="cart-price">

                        ₹${item.price}
                        ×
                        ${item.qty}
                        =
                        ₹${subTotal}

                    </div>

                </div>



                ${
                    setText
                        ? `
                        <div class="cart-price">
                            ${setText} × ${item.qty} qty
                        </div>
                        `
                        : ""
                }



                <button
                    class="remove-item"
                    onclick="removeItem('${item.id}')">

                    Remove

                </button>



            </div>

            `;

        }
    );



    // =================================================
    // SHIPPING
    // =================================================

    const shipping =
        getShipping(total);



    // =================================================
    // ORDER TOTAL
    // =================================================

    const orderTotal =
        total + shipping;



    // =================================================
    // ITEMS TOTAL
    // =================================================

    const summaryTotal =
        document.getElementById(
            "summaryTotal"
        );

    if (summaryTotal) {

        summaryTotal.innerText =
            "₹" + total;

    }



    // =================================================
    // DELIVERY
    // =================================================

    const shippingPrice =
        document.getElementById(
            "shippingPrice"
        );

    if (shippingPrice) {

        if (
            total >= FREE_SHIPPING_LIMIT
        ) {

            shippingPrice.innerText =
                "FREE";

        }

        else if (
            total > 0
        ) {

            shippingPrice.innerText =
                "₹75";

        }

        else {

            shippingPrice.innerText =
                "₹0";

        }

    }



    // =================================================
    // GRAND TOTAL
    // =================================================

    const grandTotalElement =
        document.getElementById(
            "grandTotal"
        );

    if (grandTotalElement) {

        grandTotalElement.innerText =
            "₹" + orderTotal;

    }



    // =================================================
    // MAIN BOTTOM BAR
    // =================================================

    const bottomTotal =
        document.getElementById(
            "bottomTotal"
        );

    if (bottomTotal) {

        bottomTotal.innerText =
            "₹" + orderTotal;

    }



    // =================================================
    // OFFER ELEMENTS
    // =================================================

    const offerBar =
        document.getElementById(
            "offerBar"
        );

    const offerCount =
        document.getElementById(
            "offerCount"
        );

    const offerText =
        document.getElementById(
            "offerText"
        );



    // =================================================
    // FREE SHIPPING PROGRESS
    // =================================================

    if (
        total > 0 &&
        total < FREE_SHIPPING_LIMIT
    ) {

        const remaining =
            FREE_SHIPPING_LIMIT - total;



        if (offerCount) {

            offerCount.innerText =
                `₹${total} / ₹${FREE_SHIPPING_LIMIT}`;

        }



        if (offerText) {

            offerText.innerText =
                `Add ₹${remaining} more to unlock FREE SHIPPING`;

        }



        if (offerBar) {

            offerBar.style.width =
                Math.min(
                    (
                        total /
                        FREE_SHIPPING_LIMIT
                    ) * 100,
                    100
                ) + "%";

        }

    }



    // =================================================
    // FREE SHIPPING
    // =================================================

    else if (
        total >= FREE_SHIPPING_LIMIT
    ) {

        if (offerCount) {

            offerCount.innerText =
                `₹${total} / ₹${FREE_SHIPPING_LIMIT}`;

        }



        if (offerText) {

            offerText.innerText =
                "🎉 FREE SHIPPING UNLOCKED";

        }



        if (offerBar) {

            offerBar.style.width =
                "100%";

        }

    }



    // =================================================
    // EMPTY CART
    // =================================================

    else {

        if (offerCount) {

            offerCount.innerText =
                `₹0 / ₹${FREE_SHIPPING_LIMIT}`;

        }



        if (offerText) {

            offerText.innerText =
                `Add ₹${FREE_SHIPPING_LIMIT} to unlock FREE SHIPPING`;

        }



        if (offerBar) {

            offerBar.style.width =
                "0%";

        }



        // Close cart if it becomes empty.

        closeCart();



        const cartHeader =
            document.getElementById(
                "cartHeader"
            );



        if (cartHeader) {

            cartHeader.style.display =
                "none";

        }

    }



    // =================================================
    // SHOW CART HEADER
    // =================================================

    if (total > 0) {

        const cartHeader =
            document.getElementById(
                "cartHeader"
            );

        if (cartHeader) {

            cartHeader.style.display =
                "flex";

        }

    }



    // =================================================
    // UPDATE ALL PRODUCT QUANTITY COUNTERS
    // =================================================

    document
        .querySelectorAll(".qty")
        .forEach(
            qtyElement => {

                const id =
                    qtyElement.id.replace(
                        "qty-",
                        ""
                    );



                qtyElement.innerText =
                    cart[id]
                        ? cart[id].qty
                        : 0;

            }
        );



    // =================================================
    // UPDATE VIEW / CLOSE CART TEXT
    // =================================================

    updateCartHandleText();

}



// =====================================================
// CHECKOUT
// =====================================================

function checkoutCart() {

    const products =
        getCartProducts();



    // =================================================
    // EMPTY CART
    // =================================================

    if (
        products.length === 0
    ) {

        showToast(
            "No products in cart"
        );

        return;

    }



    // =================================================
    // CALCULATE PRODUCT TOTAL
    // =================================================

    let total = 0;



    products.forEach(
        item => {

            const subTotal =
                Number(item.price) *
                Number(item.qty);



            total += subTotal;

        }
    );



    // =================================================
    // MINIMUM CART VALUE
    // =================================================

    if (
        total < MIN_CART_VALUE
    ) {

        showToast(
            `Minimum cart value required is ₹${MIN_CART_VALUE}`
        );

        return;

    }



    // =================================================
    // WHATSAPP MESSAGE
    // =================================================

    let message =
        "🛒 *Accessories Order - Diecast.scape*%0A%0A";



    // =================================================
    // PRODUCTS
    // =================================================

    products.forEach(
        item => {

            const subTotal =
                Number(item.price) *
                Number(item.qty);



            message +=
                `• ${item.name}%0A`;



            // FIREBASE SET × CART QUANTITY

            if (
                item.quantityText
            ) {

                message +=
                    `${item.quantityText} × ${item.qty} qty%0A`;

            }

            else {

                message +=
                    `Qty : ${item.qty}%0A`;

            }



            // PRICE

            message +=
                `₹${item.price} × ${item.qty} = ₹${subTotal}%0A%0A`;

        }
    );



    // =================================================
    // SHIPPING
    // =================================================

    const shipping =
        getShipping(total);



    // =================================================
    // ORDER TOTAL
    // =================================================

    const orderTotal =
        total + shipping;



    // =================================================
    // OFFER TEXT
    // =================================================

    let offerText;



    if (
        total >= FREE_SHIPPING_LIMIT
    ) {

        offerText =
            "FREE SHIPPING UNLOCKED";

    }

    else {

        offerText =
            `Add ₹${FREE_SHIPPING_LIMIT - total} more to unlock FREE SHIPPING`;

    }



    // =================================================
    // WHATSAPP SUMMARY
    // =================================================

    message +=
        "━━━━━━━━━━━━━━%0A";



    message +=
        `Product Total : ₹${total}%0A`;



    // =================================================
    // SHIPPING
    // =================================================

    if (
        shipping === 0
    ) {

        message +=
            "Shipping : FREE%0A";

    }

    else {

        message +=
            "Shipping : ₹75%0A";

    }



    // =================================================
    // OFFER
    // =================================================

    message +=
        `Offer : ${offerText}%0A`;



    message +=
        "━━━━━━━━━━━━━━%0A";



    // =================================================
    // FINAL ORDER TOTAL
    // =================================================

    message +=
        `*Order Total : ₹${orderTotal}*%0A%0A`;



    message +=
        "Share me your payment option.";



    // =================================================
    // SHOW WHATSAPP REDIRECT POPUP
    // =================================================

    showWhatsAppPopup(
        message
    );

}



// =====================================================
// WHATSAPP REDIRECT POPUP
// =====================================================

function showWhatsAppPopup(message) {

    const oldPopup =
        document.getElementById(
            "whatsappRedirectPopup"
        );



    if (oldPopup) {

        oldPopup.remove();

    }



    const popup =
        document.createElement(
            "div"
        );



    popup.id =
        "whatsappRedirectPopup";



    popup.className =
        "whatsapp-redirect-overlay";



    popup.innerHTML = `

        <div class="whatsapp-redirect-box">

            <div class="whatsapp-redirect-icon">
                💬
            </div>

            <h3>
                Continue Your Order
            </h3>

            <p>
                You are being redirected to WhatsApp
                to proceed with your order.
            </p>

            <div class="whatsapp-redirect-actions">

                <button
                    type="button"
                    class="whatsapp-cancel-btn"
                    id="whatsappCancelBtn">

                    Cancel

                </button>

                <button
                    type="button"
                    class="whatsapp-continue-btn"
                    id="whatsappContinueBtn">

                    Continue

                </button>

            </div>

        </div>

    `;



    document.body.appendChild(
        popup
    );



    // Prevent background scrolling

    document.body.style.overflow =
        "hidden";



    // =================================================
    // CANCEL
    // =================================================

    const cancelBtn =
        document.getElementById(
            "whatsappCancelBtn"
        );



    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            () => {

                popup.remove();

                document.body.style.overflow =
                    "";

            }
        );

    }



    // =================================================
    // CONTINUE TO WHATSAPP
    // =================================================

    const continueBtn =
        document.getElementById(
            "whatsappContinueBtn"
        );



    if (continueBtn) {

        continueBtn.addEventListener(
            "click",
            () => {

                window.open(
                    "https://wa.me/918792744018?text=" +
                    message,
                    "_blank"
                );



                popup.remove();

                document.body.style.overflow =
                    "";

            }
        );

    }



    // =================================================
    // CLICK OUTSIDE POPUP
    // =================================================

    popup.addEventListener(
        "click",
        event => {

            if (
                event.target === popup
            ) {

                popup.remove();

                document.body.style.overflow =
                    "";

            }

        }
    );

}



// =====================================================
// CLEAR CART POPUP
// =====================================================

function showClearCartPopup() {

    const oldPopup =
        document.getElementById(
            "clearCartPopup"
        );



    if (oldPopup) {

        oldPopup.remove();

    }



    const popup =
        document.createElement(
            "div"
        );



    popup.id =
        "clearCartPopup";



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
                all items from your cart?
            </p>

            <div class="whatsapp-redirect-actions">

                <button
                    type="button"
                    class="whatsapp-cancel-btn"
                    id="clearCartCancelBtn">

                    Cancel

                </button>

                <button
                    type="button"
                    class="whatsapp-continue-btn"
                    id="clearCartConfirmBtn">

                    Clear Cart

                </button>

            </div>

        </div>

    `;



    document.body.appendChild(
        popup
    );



    // Prevent background scrolling

    document.body.style.overflow =
        "hidden";



    // =================================================
    // CANCEL
    // =================================================

    const cancelBtn =
        document.getElementById(
            "clearCartCancelBtn"
        );



    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            () => {

                popup.remove();

                document.body.style.overflow =
                    "";

            }
        );

    }



    // =================================================
    // CONFIRM CLEAR
    // =================================================

    const confirmBtn =
        document.getElementById(
            "clearCartConfirmBtn"
        );



    if (confirmBtn) {

        confirmBtn.addEventListener(
            "click",
            () => {

                cart = {};

                saveCart();

                renderCart();

                popup.remove();

                document.body.style.overflow =
                    "";

            }
        );

    }



    // =================================================
    // CLICK OUTSIDE POPUP
    // =================================================

    popup.addEventListener(
        "click",
        event => {

            if (
                event.target === popup
            ) {

                popup.remove();

                document.body.style.overflow =
                    "";

            }

        }
    );

}



// =====================================================
// TOAST MESSAGE
// =====================================================

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );



    if (!toast) {

        console.error(
            "Toast element #toast not found."
        );

        return;

    }



    toast.innerText =
        message;



    toast.classList.add(
        "show"
    );



    clearTimeout(
        window.toastTimer
    );



    window.toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}



// =====================================================
// DOM READY
// =====================================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        const cartBox =
            document.getElementById(
                "cartBox"
            );



        const cartHeader =
            document.getElementById(
                "cartHeader"
            );



        const cartOverlay =
            document.getElementById(
                "cartOverlay"
            );



        const checkoutBtn =
            document.getElementById(
                "checkoutBtn"
            );



        const clearCartBtn =
            document.getElementById(
                "clearCartBtn"
            );



        // ===============================================
        // INITIAL OVERLAY STATE
        // ===============================================

        if (cartOverlay) {

            cartOverlay.classList.remove(
                "show"
            );



            cartOverlay.style.pointerEvents =
                "none";

        }



        // ===============================================
        // RENDER SAVED CART
        // ===============================================

        renderCart();



        // ===============================================
        // CART HANDLE
        // ===============================================

        if (cartHeader) {

            cartHeader.addEventListener(
                "click",
                event => {

                    event.stopPropagation();



                    if (!cartBox) return;



                    const isOpen =
                        cartBox.classList.contains(
                            "open"
                        );



                    if (isOpen) {

                        closeCart();

                    }

                    else {

                        // Enable overlay interaction
                        // only while cart is open.

                        if (cartOverlay) {

                            cartOverlay.style.pointerEvents =
                                "auto";

                        }



                        openCart();

                    }

                }
            );

        }



        // ===============================================
        // OVERLAY CLICK
        // ===============================================

        if (cartOverlay) {

            cartOverlay.addEventListener(
                "click",
                event => {

                    // Only close when the actual
                    // overlay is clicked.

                    if (
                        event.target ===
                        cartOverlay
                    ) {

                        closeCart();

                    }

                }
            );

        }



        // ===============================================
        // CHECKOUT
        // ===============================================

        if (checkoutBtn) {

            checkoutBtn.addEventListener(
                "click",
                checkoutCart
            );

        }



        // ===============================================
        // CLEAR CART
        // ===============================================

        if (clearCartBtn) {

            clearCartBtn.addEventListener(
                "click",
                () => {

                    if (
                        !Object.keys(cart).length
                    ) {

                        showToast(
                            "Cart is already empty"
                        );

                        return;

                    }



                    showClearCartPopup();

                }
            );

        }



        // ===============================================
        // INITIAL HANDLE TEXT
        // ===============================================

        updateCartHandleText();

    }
);
