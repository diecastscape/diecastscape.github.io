// =====================================================
// FRAME CART SYSTEM
// =====================================================

const CART_KEY = "diecastscape_cart";

let cart =
    JSON.parse(localStorage.getItem(CART_KEY)) || {};


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

function addProductInfo(id, name, price) {

    if (cart[id]) {

        cart[id].qty++;

    } else {

        cart[id] = {

            id,
            name,
            price,
            qty: 1

        };

    }

    saveCart();

    renderCart();

}


// =====================================================
// SHIPPING
// =====================================================

function getShipping(count) {

    if (count === 0) {
        return 0;
    }

    // Up to 2 frames = ₹75 shipping
    if (count <= 2) {
        return 75;
    }

    // 3 or more frames = FREE shipping
    return 0;

}


// =====================================================
// UPDATE FRAME ADDED STATUS
// =====================================================

window.updateFrameAddedStatus = function () {

    const cart =
        JSON.parse(
            localStorage.getItem("diecastscape_cart")
        ) || {};

    document
        .querySelectorAll(".shop-card")
        .forEach(card => {

            const button =
                card.querySelector(".add-cart-btn");

            if (!button) return;

            const price =
                card.querySelector(".price");

            if (!price) return;

            const match =
                button
                    .getAttribute("onclick")
                    ?.match(
                        /addProductInfo\(\s*['"]([^'"]+)['"]/
                    );

            if (!match) return;

            const productId =
                match[1];

            const addedText =
                price.querySelector(
                    ".added-cart-text"
                );


            // Product is in cart
            if (cart[productId]) {

                if (!addedText) {

                    price.insertAdjacentHTML(
                        "beforeend",
                        `<span class="added-cart-text">Added ✔️</span>`
                    );

                }

            }


            // Product is NOT in cart
            else {

                if (addedText) {
                    addedText.remove();
                }

            }

        });

};


// =====================================================
// UPDATE CART HANDLE TEXT
// =====================================================

function updateCartHandleText() {

    const cartHeader =
        document.getElementById(
            "cartHeader"
        );

    if (!cartHeader) return;


    const cartBox =
        document.getElementById(
            "cartBox"
        );


    const isOpen =
        cartBox &&
        cartBox.classList.contains("open");


    let textElement =
        cartHeader.querySelector(
            ".cart-title"
        );


    // Create text element if it does not exist
    if (!textElement) {

        textElement =
            document.createElement("span");

        textElement.className =
            "cart-title";

        cartHeader.appendChild(
            textElement
        );

    }


    // OPEN = CLOSE CART
    if (isOpen) {

        textElement.innerText =
            "Close Cart";

    }


    // CLOSED = VIEW CART
    else {

        textElement.innerText =
            "View Cart";

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


    cartBox.classList.add(
        "open"
    );


    if (cartOverlay) {

        cartOverlay.classList.add(
            "show"
        );

        cartOverlay.style.pointerEvents =
            "auto";

    }


    document.body.style.overflow =
        "hidden";


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


    if (cartBox) {

        cartBox.classList.remove(
            "open"
        );

    }


    if (cartOverlay) {

        cartOverlay.classList.remove(
            "show"
        );

        cartOverlay.style.pointerEvents =
            "none";

    }


    document.body.style.overflow =
        "";


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

    let count = 0;


    // =================================================
    // CART ITEMS
    // =================================================

    getCartProducts().forEach(item => {

        const subTotal =
            item.price * item.qty;

        total += subTotal;

        count += item.qty;


        list.innerHTML += `

        <div class="cart-item">

            <div class="cart-row">

                <div class="cart-name">
                    ${item.name}
                </div>

                <div class="cart-price">
                    ${item.price} × ${item.qty} = ₹${subTotal}
                </div>

            </div>


            <button
                class="remove-item"
                onclick="removeItem('${item.id}')">

                Remove

            </button>

        </div>

        `;

    });


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

    const offerApply =
        document.getElementById(
            "offerApply"
        );

    const offerApply2 =
        document.getElementById(
            "offerApply2"
        );

    const offerApply3 =
        document.getElementById(
            "offerApply3"
        );


    // =================================================
    // SHIPPING
    // =================================================

    const shipping =
        getShipping(count);


    // =================================================
    // DISCOUNT
    // =================================================

    let discount = 0;


    // 0–3 frames
    if (count < 3) {

        discount = 0;

    }


    // 4–5 frames
    else if (count < 6) {

        discount = 0;

    }


    // 6+ frames
    else {

        discount =
            Math.round(
                total * 0.20
            );

    }


    // =================================================
    // TOTAL CALCULATION
    // =================================================

    const finalPrice =
        total + shipping;

    const grandTotal =
        finalPrice - discount;


    // =================================================
    // UPDATE CART SUMMARY
    // =================================================

    const summaryTotal =
        document.getElementById(
            "summaryTotal"
        );

    if (summaryTotal) {

        summaryTotal.innerText =
            "₹" + total;

    }


    const shippingPrice =
        document.getElementById(
            "shippingPrice"
        );

    if (shippingPrice) {

        shippingPrice.innerText =
            shipping === 0 && count >= 3
                ? "₹0"
                : "₹" + shipping;

    }


    const bottomTotal =
        document.getElementById(
            "bottomTotal"
        );

    if (bottomTotal) {

        bottomTotal.innerText =
            "₹" + finalPrice;

    }


    const offerSave =
        document.getElementById(
            "offerSave"
        );

    if (offerSave) {

        offerSave.innerText =
            "-₹" + discount;

    }


    const grandTotalElement =
        document.getElementById(
            "grandTotal"
        );

    if (grandTotalElement) {

        grandTotalElement.innerText =
            "₹" + grandTotal;

    }


    const grandTotal1 =
        document.getElementById(
            "grandTotal1"
        );

    if (grandTotal1) {

        grandTotal1.innerText =
            "₹" + grandTotal;

    }


    // =================================================
    // PROGRESSIVE OFFER BAR
    // =================================================

    // -------------------------
    // 0–3 FRAME
    // -------------------------

    if (count < 3) {

        const remaining =
            3 - count;


        if (offerCount) {

            offerCount.innerText =
                `${count} / 3 Frames`;

        }


        if (offerText) {

            offerText.innerText =
                `Add ${remaining} frame${remaining > 1 ? "s" : ""} to unlock FREE SHIPPING`;

        }


        if (offerApply) {

            offerApply.innerText =
                "";

        }


        if (offerApply2) {

            offerApply2.innerText =
                "";

        }


        if (offerBar) {

            offerBar.style.width =
                (count / 3 * 100) + "%";

        }

    }


    // -------------------------
    // 4–5 FRAMES
    // FREE SHIPPING
    // -------------------------

    else if (count < 6) {

        const remaining =
            6 - count;


        if (offerCount) {

            offerCount.innerText =
                `${count} / 6 Frames`;

        }


        if (offerText) {

            offerText.innerText =
                `Free delivery Unlocked.Add ${remaining} more frame${remaining > 1 ? "s" : ""} to get 20% OFF`;

        }


        if (offerApply) {

            offerApply.innerText =
                "";

        }


        if (offerApply2) {

            offerApply2.innerText =
                "Offer applyd ";

        }


        if (offerApply3) {

            offerApply3.innerText =
                "Free delivery";

        }


        if (offerBar) {

            offerBar.style.width =
                (count / 6 * 100) + "%";

        }

    }


    // -------------------------
    // 6+ FRAMES
    // 20% OFF + FREE SHIPPING
    // -------------------------

    else {

        if (offerCount) {

            offerCount.innerText =
                `${count} Frames`;

        }


        if (offerText) {

            offerText.innerText =
                "🎉 20% Off + Free delivery Unlocked";

        }


        if (offerApply) {

            offerApply.innerText =
                "20% off";

        }


        if (offerApply2) {

            offerApply2.innerText =
                "Offer applyd ";

        }


        if (offerApply3) {

            offerApply3.innerText =
                "Free delivery";

        }


        if (offerBar) {

            offerBar.style.width =
                "100%";

        }

    }


    // =================================================
    // EMPTY CART
    // =================================================

    if (count === 0) {

        if (shippingPrice) {

            shippingPrice.innerText =
                "₹0";

        }


        if (offerSave) {

            offerSave.innerText =
                "-₹0";

        }


        if (grandTotalElement) {

            grandTotalElement.innerText =
                "₹0";

        }


        if (grandTotal1) {

            grandTotal1.innerText =
                "₹0";

        }


        if (bottomTotal) {

            bottomTotal.innerText =
                "₹0";

        }


        if (offerCount) {

            offerCount.innerText =
                "0 / 3 Frames";

        }


        if (offerText) {

            offerText.innerText =
                "Add 3 frames to unlock FREE SHIPPING";

        }


        if (offerApply) {

            offerApply.innerText =
                "";

        }


        if (offerApply2) {

            offerApply2.innerText =
                "";

        }


        if (offerApply3) {

            offerApply3.innerText =
                "";

        }


        if (offerBar) {

            offerBar.style.width =
                "0%";

        }


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

    else {

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
    // UPDATE ADDED STATUS
    // =================================================

    updateFrameAddedStatus();


    if (
        window.updateAccessoryAddedStatus
    ) {

        updateAccessoryAddedStatus();

    }


    // =================================================
    // UPDATE VIEW CART TEXT
    // =================================================

    updateCartHandleText();

}


// =====================================================
// REMOVE PRODUCT
// =====================================================

function removeItem(id) {

    delete cart[id];

    saveCart();

    renderCart();

    updateFrameAddedStatus();


    if (
        window.updateAccessoryAddedStatus
    ) {

        updateAccessoryAddedStatus();

    }

}


// =====================================================
// TOAST MESSAGE
// =====================================================

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) return;


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
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            2000
        );

}


// =====================================================
// CHECKOUT
// =====================================================

function checkoutCart() {

    const products =
        getCartProducts();


    if (products.length === 0) {

        showToast(
            "No products in cart"
        );

        return;

    }


    let total = 0;

    let count = 0;

    let message =
        "*Hello - Diecast.scape*%0A%0A";


    // =================================================
    // PRODUCTS
    // =================================================

    products.forEach(item => {

        const subTotal =
            item.price * item.qty;

        total += subTotal;

        count += item.qty;


        message +=
            `• ${item.name}%0A`;

        message +=
            `₹${item.price} × ${item.qty} = ₹${subTotal}%0A%0A`;

    });


    // =================================================
    // SHIPPING
    // =================================================

    const shipping =
        getShipping(count);


    // =================================================
    // DISCOUNT
    // =================================================

    let discount = 0;


    if (count >= 6) {

        discount =
            Math.round(
                total * 0.20
            );

    }


    // =================================================
    // GRAND TOTAL
    // =================================================

    const grandTotal =
        total +
        shipping -
        discount;


    // =================================================
    // WHATSAPP MESSAGE
    // =================================================

    message +=
        "━━━━━━━━━━━━━━%0A";


    message +=
        `Total Frames : ${count}%0A`;

    message +=
        `Product Total : ₹${total}%0A`;


    // Show FREE for 3+ frames
    if (count >= 3) {

        message +=
            "Shipping : FREE%0A";

    }

    else {

        message +=
            `Shipping : ₹${shipping}%0A`;

    }


    message +=
        `Discount : - ₹${discount}%0A`;


    message +=
        "━━━━━━━━━━━━━━%0A";


    message +=
        `*Grand Total : ₹${grandTotal}*%0A%0A`;


    message +=
        "Share me payment details.";


    // =================================================
    // SHOW CHECKOUT POPUP
    // =================================================

    showWhatsAppPopup(
        message
    );

}


// =====================================================
// WHATSAPP CHECKOUT POPUP
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

                // Keep cart open
                const cartBox =
                    document.getElementById(
                        "cartBox"
                    );

                if (
                    cartBox &&
                    cartBox.classList.contains("open")
                ) {

                    document.body.style.overflow =
                        "hidden";

                }

                else {

                    document.body.style.overflow =
                        "";

                }

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


                const cartBox =
                    document.getElementById(
                        "cartBox"
                    );


                if (
                    cartBox &&
                    cartBox.classList.contains("open")
                ) {

                    document.body.style.overflow =
                        "hidden";

                }

                else {

                    document.body.style.overflow =
                        "";

                }

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


                const cartBox =
                    document.getElementById(
                        "cartBox"
                    );


                if (
                    cartBox &&
                    cartBox.classList.contains("open")
                ) {

                    document.body.style.overflow =
                        "hidden";

                }

                else {

                    document.body.style.overflow =
                        "";

                }

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


                const cartBox =
                    document.getElementById(
                        "cartBox"
                    );


                if (
                    cartBox &&
                    cartBox.classList.contains("open")
                ) {

                    document.body.style.overflow =
                        "hidden";

                }

                else {

                    document.body.style.overflow =
                        "";

                }

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

                updateFrameAddedStatus();


                if (
                    window.updateAccessoryAddedStatus
                ) {

                    updateAccessoryAddedStatus();

                }

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


                const cartBox =
                    document.getElementById(
                        "cartBox"
                    );


                if (
                    cartBox &&
                    cartBox.classList.contains("open")
                ) {

                    document.body.style.overflow =
                        "hidden";

                }

                else {

                    document.body.style.overflow =
                        "";

                }

            }

        }
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


        // =================================================
        // INITIAL OVERLAY STATE
        // =================================================

        if (cartOverlay) {

            cartOverlay.classList.remove(
                "show"
            );

            cartOverlay.style.pointerEvents =
                "none";

        }


        // =================================================
        // RENDER SAVED CART
        // =================================================

        renderCart();


        // =================================================
        // CART HEADER / VIEW CART BUTTON
        // =================================================

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

                        openCart();

                    }

                }
            );

        }


        // =================================================
        // CART OVERLAY
        // =================================================

        if (cartOverlay) {

            cartOverlay.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        cartOverlay
                    ) {

                        closeCart();

                    }

                }
            );

        }


        // =================================================
        // CHECKOUT
        // =================================================

        if (checkoutBtn) {

            checkoutBtn.addEventListener(
                "click",
                checkoutCart
            );

        }


        // =================================================
        // CLEAR CART
        // =================================================

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


        // =================================================
        // INITIAL VIEW CART TEXT
        // =================================================

        updateCartHandleText();

    }
);
