// =====================================================
// ACCESSORIES CART SYSTEM
// =====================================================

const CART_KEY =
    "diecastscape_accessories_cart";

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
//
// quantityText = Firebase quantity
// Example: "Set of 5"
// =====================================================

function addProductInfo(
    id,
    name,
    price,
    quantityText = ""
) {

    if (cart[id]) {

        cart[id].qty++;

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

            // Update Firebase set quantity
            // if it was missing in old cart data

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


            // Remove completely
            // when quantity reaches zero

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

    // Empty cart

    if (total <= 0) {

        return 0;

    }


    // ₹650 or more
    // FREE SHIPPING

    if (total >= 650) {

        return 0;

    }


    // Below ₹650
    // Fixed ₹69 shipping

    return 69;

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

    }


    document.body.style.overflow =
        "";

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


            // Firebase set quantity
            //
            // Example:
            // Set of 5
            //
            // If old cart data does not have
            // quantityText, simply don't show it.

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
                        <div class="cart-set-info">
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
    // FINAL ORDER TOTAL
    // =================================================

    const grandTotal =
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

        if (total >= 650) {

            shippingPrice.innerText =
                "FREE";

        }

        else if (total > 0) {

            shippingPrice.innerText =
                "₹69";

        }

        else {

            shippingPrice.innerText =
                "₹0";

        }

    }


    // =================================================
    // ORDER TOTAL
    // =================================================

    const grandTotalElement =
        document.getElementById(
            "grandTotal"
        );

    if (grandTotalElement) {

        grandTotalElement.innerText =
            "₹" + grandTotal;

    }


    // =================================================
    // MAIN BOTTOM BAR TOTAL
    // =================================================

    const bottomTotal =
        document.getElementById(
            "bottomTotal"
        );

    if (bottomTotal) {

        bottomTotal.innerText =
            "₹" + grandTotal;

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
    // BELOW ₹650
    // =================================================

    if (
        total > 0 &&
        total < 650
    ) {


        const remaining =
            650 - total;


        if (offerCount) {

            offerCount.innerText =
                `₹${total} / ₹650`;

        }


        if (offerText) {

            offerText.innerText =
                `Add ₹${remaining} more to unlock FREE SHIPPING`;

        }


        if (offerBar) {

            offerBar.style.width =
                Math.min(
                    (total / 650) * 100,
                    100
                ) + "%";

        }

    }


    // =================================================
    // ₹650+
    // FREE SHIPPING
    // NO OTHER OFFER
    // =================================================

    else if (
        total >= 650
    ) {


        if (offerCount) {

            offerCount.innerText =
                `₹${total} / ₹650`;

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
                "₹0 / ₹650";

        }


        if (offerText) {

            offerText.innerText =
                "Add ₹650 to unlock FREE SHIPPING";

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
    // UPDATE ALL ACCESSORY QUANTITY COUNTERS
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


    let total = 0;


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


            total += subTotal;


            // ==========================================
            // PRODUCT NAME
            // ==========================================

            message +=
                `• ${item.name}%0A`;


            // ==========================================
            // FIREBASE SET QUANTITY × CART QUANTITY
            //
            // Example:
            // Set of 5 × 3 qty
            // ==========================================

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


            // ==========================================
            // PRICE
            // ==========================================

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
    // GRAND TOTAL
    // =================================================

    const grandTotal =
        total + shipping;


    // =================================================
    // OFFER TEXT
    // =================================================

    let offerText;


    if (total >= 650) {

        offerText =
            "FREE SHIPPING UNLOCKED";

    }

    else {

        offerText =
            `Add ₹${650 - total} more to unlock FREE SHIPPING`;

    }


    // =================================================
    // WHATSAPP SUMMARY
    // =================================================

    message +=
        "━━━━━━━━━━━━━━%0A";


    message +=
        `Product Total : ₹${total}%0A`;


    // Shipping

    if (shipping === 0) {

        message +=
            "Shipping : FREE%0A";

    }

    else {

        message +=
            "Shipping : ₹69%0A";

    }


    // Offer

    message +=
        `Offer : ${offerText}%0A`;


    message +=
        "━━━━━━━━━━━━━━%0A";


    // Final amount

    message +=
        `*Order Total : ₹${grandTotal}*%0A%0A`;


    message +=
        "Share me your payment option.";


    // =================================================
    // WHATSAPP
    // =================================================

    window.open(

        "https://wa.me/918792744018?text=" +
        message,

        "_blank"

    );

}


// =====================================================
// TOAST
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
        // RENDER SAVED CART
        // ===============================================

        renderCart();


        // ===============================================
        // CART HEADER
        // ===============================================

        if (cartHeader) {

            cartHeader.addEventListener(
                "click",
                () => {


                    if (!cartBox) return;


                    cartBox.classList.toggle(
                        "open"
                    );


                    if (
                        cartBox.classList.contains(
                            "open"
                        )
                    ) {


                        if (cartOverlay) {

                            cartOverlay.classList.add(
                                "show"
                            );

                        }


                        document.body.style.overflow =
                            "hidden";

                    }

                    else {

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


                    if (
                        confirm(
                            "Remove all items?"
                        )
                    ) {


                        cart = {};


                        saveCart();


                        renderCart();

                    }

                }
            );

        }

    }
);
