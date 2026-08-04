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
// REMOVE PRODUCT
// =====================================================

function removeItem(id) {

    delete cart[id];

    saveCart();

    renderCart();

}


// =====================================================
// ACCESSORIES SHIPPING
// =====================================================

function getShipping(total) {

    if (total <= 0) {

        return 0;

    }

    // Below ₹500 = ₹100 shipping
    if (total < 500) {

        return 100;

    }

    // ₹500 or more = FREE SHIPPING
    return 0;

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
            Number(item.price) * Number(item.qty);

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
    // DISCOUNT
    // =================================================

    let discount = 0;


    // ₹1000+ = 25% OFF
    if (total >= 1000) {

        discount =
            Math.round(total * 0.25);

    }


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

    document.getElementById(
        "summaryTotal"
    ).innerText =
        "₹" + total;


    // Delivery
    if (total >= 500) {

        document.getElementById(
            "shippingPrice"
        ).innerText = "FREE";

    } else {

        document.getElementById(
            "shippingPrice"
        ).innerText =
            "₹" + shipping;

    }


    // Total before discount
    document.getElementById(
        "bottomTotal"
    ).innerText =
        "₹" + finalPrice;


    // Discount
    document.getElementById(
        "offerSave"
    ).innerText =
        "-₹" + discount;


    // Final order total
    document.getElementById(
        "grandTotal"
    ).innerText =
        "₹" + grandTotal;


    document.getElementById(
        "grandTotal1"
    ).innerText =
        "₹" + grandTotal;


    // =================================================
    // PROGRESSIVE OFFER BAR
    // =================================================


    // -------------------------------------------------
    // ₹0 – ₹499
    // GOAL = FREE SHIPPING AT ₹500
    // -------------------------------------------------

    if (total < 500) {

        const remaining =
            500 - total;


        offerCount.innerText =
            `₹${total} / ₹500`;


        offerText.innerText =
            `Add ₹${remaining} more to unlock FREE SHIPPING`;


        offerApply.innerText =
            "";


        offerApply2.innerText =
            "";


        if (offerApply3) {

            offerApply3.innerText =
                "₹100 Delivery";

        }


        offerBar.style.width =
            (total / 500 * 100) + "%";

    }


    // -------------------------------------------------
    // ₹500 – ₹999
    // GOAL = 25% OFF AT ₹1000
    // -------------------------------------------------

    else if (total < 1000) {

        const remaining =
            1000 - total;


        offerCount.innerText =
            `₹${total} / ₹1000`;


        offerText.innerText =
            `FREE SHIPPING UNLOCKED. Add ₹${remaining} more to get 25% OFF`;


        offerApply.innerText =
            "";


        offerApply2.innerText =
            "FREE SHIPPING";


        if (offerApply3) {

            offerApply3.innerText =
                "FREE";

        }


        // Progress from ₹500 to ₹1000
        offerBar.style.width =
            ((total - 500) / 500 * 100) + "%";

    }


    // -------------------------------------------------
    // ₹1000+
    // 25% OFF + FREE SHIPPING
    // -------------------------------------------------

    else {

        offerCount.innerText =
            `₹${total}`;


        offerText.innerText =
            `🎉 25% OFF + FREE SHIPPING UNLOCKED`;


        offerApply.innerText =
            "25% OFF";


        offerApply2.innerText =
            "25% OFF";


        if (offerApply3) {

            offerApply3.innerText =
                "FREE";

        }


        offerBar.style.width =
            "100%";

    }


    // =================================================
    // EMPTY CART
    // =================================================

    if (total === 0) {

        document.getElementById(
            "shippingPrice"
        ).innerText =
            "₹0";


        document.getElementById(
            "offerSave"
        ).innerText =
            "-₹0";


        document.getElementById(
            "grandTotal"
        ).innerText =
            "₹0";


        document.getElementById(
            "grandTotal1"
        ).innerText =
            "₹0";


        document.getElementById(
            "bottomTotal"
        ).innerText =
            "₹0";


        offerCount.innerText =
            "₹0 / ₹500";


        offerText.innerText =
            "Add ₹500 to unlock FREE SHIPPING";


        offerApply.innerText =
            "";


        offerApply2.innerText =
            "";


        if (offerApply3) {

            offerApply3.innerText =
                "₹0";

        }


        offerBar.style.width =
            "0%";


        cartBox.classList.remove("open");

        cartOverlay.classList.remove("show");

        document.body.style.overflow =
            "";


        cartHeader.style.display =
            "none";

    }

    else {

        cartHeader.style.display =
            "flex";

    }

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
            item.price * item.qty;


        total += subTotal;


        message +=
            `• ${item.name}%0A`;


        message +=
            `Qty : ${item.qty}%0A`;


        message +=
            `₹${item.price} × ${item.qty} = ₹${subTotal}%0A%0A`;

    });


    // =================================================
    // OFFER SYSTEM
    // =================================================

    const shipping =
        getShipping(total);


    let discount = 0;


    // ₹1000+ = 25% OFF
    if (total >= 1000) {

        discount =
            Math.round(total * 0.25);

    }


    const grandTotal =
        total +
        shipping -
        discount;


    // =================================================
    // OFFER TEXT
    // =================================================

    let offerText = "";


    if (total < 500) {

        offerText =
            "Add ₹500 to unlock FREE SHIPPING";

    }

    else if (total < 1000) {

        offerText =
            "FREE SHIPPING UNLOCKED";

    }

    else {

        offerText =
            "25% OFF + FREE SHIPPING UNLOCKED";

    }


    // =================================================
    // WHATSAPP ORDER
    // =================================================

    message +=
        "━━━━━━━━━━━━━━%0A";


    message +=
        `Product Total : ₹${total}%0A`;


    if (total >= 500) {

        message +=
            `Shipping : FREE%0A`;

    }

    else {

        message +=
            `Shipping : ₹${shipping}%0A`;

    }


    message +=
        `Discount : -₹${discount}%0A`;


    message +=
        `Offer : ${offerText}%0A`;


    message +=
        "━━━━━━━━━━━━━━%0A";


    message +=
        `*Grand Total : ₹${grandTotal}*%0A%0A`;


    message +=
        "Share me your payment option.";


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


        // Render saved cart
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
