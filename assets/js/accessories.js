// =====================================================
// ACCESSORIES CART SYSTEM
// =====================================================

const CART_KEY = "diecastscape_accessories_cart";

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

            id: id,
            name: name,
            price: Number(price),
            qty: 1

        };

    }

    saveCart();

    renderCart();

}


// =====================================================
// CHANGE ACCESSORY QUANTITY
// =====================================================

function changeAccessoryQty(id, name, price, change) {

    // ==========================================
    // ADD
    // ==========================================

    if (change > 0) {

        if (cart[id]) {

            cart[id].qty++;

        } else {

            cart[id] = {

                id: id,
                name: name,
                price: Number(price),
                qty: 1

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
    // UPDATE CART + QUANTITY UI
    // ==========================================

    renderCart();

    updateAccessoryQuantity(id);

}


// =====================================================
// UPDATE PRODUCT QUANTITY DISPLAY
// =====================================================

function updateAccessoryQuantity(id) {

    const qtyElement =
        document.getElementById(`qty-${id}`);

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

    // ₹650 or more = FREE SHIPPING
    if (total >= 650) {

        return 0;

    }

    // Below ₹650 = ₹69 shipping
    return 69;

}


// =====================================================
// RENDER CART
// =====================================================

function renderCart() {

    const list =
        document.getElementById("cartItems");

    if (!list) return;


    list.innerHTML = "";

    let total = 0;


    // =================================================
    // CART ITEMS
    // =================================================

    getCartProducts().forEach(item => {

        const subTotal =
            Number(item.price) *
            Number(item.qty);

        total += subTotal;


        list.innerHTML += `

        <div class="cart-item">

            <div class="cart-row">

                <div class="cart-name">

                    ${item.name}

                </div>

                <div class="cart-price">

                    ₹${item.price} × ${item.qty}
                    = ₹${subTotal}

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
        document.getElementById("offerBar");

    const offerCount =
        document.getElementById("offerCount");

    const offerText =
        document.getElementById("offerText");

    const offerApply =
        document.getElementById("offerApply");

    const offerApply2 =
        document.getElementById("offerApply2");

    const offerApply3 =
        document.getElementById("offerApply3");


    // =================================================
    // SHIPPING
    // =================================================

    const shipping =
        getShipping(total);


    // =================================================
    // NO DISCOUNT FOR NOW
    // =================================================

    const discount = 0;


    // =================================================
    // TOTAL CALCULATION
    // =================================================

    const finalPrice =
        total + shipping;

    const grandTotal =
        finalPrice - discount;


    // =================================================
    // CART SUMMARY
    // =================================================

    const summaryTotal =
        document.getElementById("summaryTotal");

    if (summaryTotal) {

        summaryTotal.innerText =
            "₹" + total;

    }


    // =================================================
    // DELIVERY
    // =================================================

    const shippingPrice =
        document.getElementById("shippingPrice");

    if (shippingPrice) {

        if (total >= 650) {

            shippingPrice.innerText =
                "FREE";

        } else if (total > 0) {

            shippingPrice.innerText =
                "₹69";

        } else {

            shippingPrice.innerText =
                "₹0";

        }

    }


    // =================================================
    // TOTAL BEFORE DISCOUNT
    // =================================================

    const bottomTotal =
        document.getElementById("bottomTotal");

    if (bottomTotal) {

        bottomTotal.innerText =
            "₹" + finalPrice;

    }


    // =================================================
    // DISCOUNT
    // =================================================

    const offerSave =
        document.getElementById("offerSave");

    if (offerSave) {

        offerSave.innerText =
            "-₹0";

    }


    // =================================================
    // FINAL ORDER TOTAL
    // =================================================

    const grandTotalElement =
        document.getElementById("grandTotal");

    if (grandTotalElement) {

        grandTotalElement.innerText =
            "₹" + grandTotal;

    }


    const grandTotal1 =
        document.getElementById("grandTotal1");

    if (grandTotal1) {

        grandTotal1.innerText =
            "₹" + grandTotal;

    }


    // =================================================
    // FREE SHIPPING PROGRESS
    // =================================================

    if (total < 650) {

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
                "₹69 Delivery";

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
    // FREE SHIPPING UNLOCKED
    // NO MORE OFFER
    // =================================================

    else {

        if (offerCount) {

            offerCount.innerText =
                `₹${total} / ₹650`;

        }


        if (offerText) {

            offerText.innerText =
                "🎉 FREE SHIPPING UNLOCKED";

        }


        if (offerApply) {

            offerApply.innerText =
                "";

        }


        if (offerApply2) {

            offerApply2.innerText =
                "FREE SHIPPING";

        }


        if (offerApply3) {

            offerApply3.innerText =
                "FREE";

        }


        if (offerBar) {

            offerBar.style.width =
                "100%";

        }

    }


    // =================================================
    // EMPTY CART
    // =================================================

    if (total === 0) {

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
                "₹0 / ₹650";

        }


        if (offerText) {

            offerText.innerText =
                "Add ₹650 to unlock FREE SHIPPING";

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
                "₹0";

        }


        if (offerBar) {

            offerBar.style.width =
                "0%";

        }


        const cartBox =
            document.getElementById("cartBox");

        const cartOverlay =
            document.getElementById("cartOverlay");

        const cartHeader =
            document.getElementById("cartHeader");


        if (cartBox) {

            cartBox.classList.remove("open");

        }


        if (cartOverlay) {

            cartOverlay.classList.remove("show");

        }


        document.body.style.overflow = "";


        if (cartHeader) {

            cartHeader.style.display =
                "none";

        }

    }

    else {

        const cartHeader =
            document.getElementById("cartHeader");

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
        .forEach(qtyElement => {

            const id =
                qtyElement.id.replace(
                    "qty-",
                    ""
                );

            qtyElement.innerText =
                cart[id]
                    ? cart[id].qty
                    : 0;

        });

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


    let message =
        "🛒 *Accessories Order - Diecast.scape*%0A%0A";


    // =================================================
    // PRODUCTS
    // =================================================

    products.forEach(item => {

        const subTotal =
            Number(item.price) *
            Number(item.qty);


        total += subTotal;


        message +=
            `• ${item.name}%0A`;

        message +=
            `Qty : ${item.qty}%0A`;

        message +=
            `₹${item.price} × ${item.qty} = ₹${subTotal}%0A%0A`;

    });


    // =================================================
    // SHIPPING
    // =================================================

    const shipping =
        getShipping(total);


    // =================================================
    // NO DISCOUNT
    // =================================================

    const discount = 0;


    // =================================================
    // GRAND TOTAL
    // =================================================

    const grandTotal =
        total +
        shipping -
        discount;


    // =================================================
    // OFFER TEXT
    // =================================================

    let offerText = "";


    if (total < 650) {

        offerText =
            `Add ₹${650 - total} more to unlock FREE SHIPPING`;

    }

    else {

        offerText =
            "FREE SHIPPING UNLOCKED";

    }


    // =================================================
    // WHATSAPP ORDER SUMMARY
    // =================================================

    message +=
        "━━━━━━━━━━━━━━%0A";


    message +=
        `Product Total : ₹${total}%0A`;


    if (total >= 650) {

        message +=
            "Shipping : FREE%0A";

    }

    else {

        message +=
            "Shipping : ₹69%0A";

    }


    message +=
        "Discount : -₹0%0A";


    message +=
        `Offer : ${offerText}%0A`;


    message +=
        "━━━━━━━━━━━━━━%0A";


    message +=
        `*Grand Total : ₹${grandTotal}*%0A%0A`;


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
        document.getElementById("toast");

    if (!toast) return;


    toast.innerText =
        message;


    toast.classList.add("show");


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


        // =================================================
        // RENDER SAVED CART
        // =================================================

        renderCart();


        // =================================================
        // CART HEADER
        // =================================================

        if (cartHeader) {

            cartHeader.addEventListener(
                "click",
                () => {

                    cartBox.classList.toggle(
                        "open"
                    );


                    if (
                        cartBox.classList.contains(
                            "open"
                        )
                    ) {

                        cartOverlay.classList.add(
                            "show"
                        );

                        document.body.style.overflow =
                            "hidden";

                    }

                    else {

                        cartOverlay.classList.remove(
                            "show"
                        );

                        document.body.style.overflow =
                            "";

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
