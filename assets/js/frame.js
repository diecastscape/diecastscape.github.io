const CART_KEY = "diecastscape_cart";

let cart = JSON.parse(localStorage.getItem(CART_KEY)) || {};
function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function getCartProducts() {
    return Object.values(cart);
}
function addProductInfo(id,name,price){

    if(cart[id]){

        cart[id].qty++;

    }else{

        cart[id]={

            id,
            name,
            price,
            qty:1

        };

    }

    saveCart();

    renderCart();

}
function getShipping(count) {

    if (count === 0) {
        return 0;
    }

    // Up to 2 frames = ₹100 shipping
    if (count <= 2) {
        return 75;
    }

    
    // 3 or more frames = FREE shipping
    return 0;
}
function renderCart() {

    const list = document.getElementById("cartItems");

    list.innerHTML = "";

    let total = 0;
    let count = 0;

    // =========================
    // CART ITEMS
    // =========================

    getCartProducts().forEach(item => {

        const subTotal = item.price * item.qty;

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


    // =========================
    // OFFER ELEMENTS
    // =========================

    const offerBar = document.getElementById("offerBar");
    const offerCount = document.getElementById("offerCount");
    const offerText = document.getElementById("offerText");
    const offerApply = document.getElementById("offerApply");
    const offerApply2 = document.getElementById("offerApply2");
    const offerApply3 = document.getElementById("offerApply3");

    // =========================
    // SHIPPING
    // =========================

    const shipping = getShipping(count);


    // =========================
    // DISCOUNT
    // =========================

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

        discount = Math.round(total * 0.20);

    }


    // =========================
    // TOTAL CALCULATION
    // =========================

    const finalPrice = total + shipping;

    const grandTotal = finalPrice - discount;


    // =========================
    // UPDATE CART SUMMARY
    // =========================

    document.getElementById("summaryTotal").innerText =
        "₹" + total;

    document.getElementById("shippingPrice").innerText =
        shipping === 0 && count >= 3
            ? "₹0"
            : "₹" + shipping;

    document.getElementById("bottomTotal").innerText =
        "₹" + finalPrice;

    document.getElementById("offerSave").innerText =
        "-₹" + discount;

    document.getElementById("grandTotal").innerText =
        "₹" + grandTotal;

    document.getElementById("grandTotal1").innerText =
        "₹" + grandTotal;


    // =========================
    // PROGRESSIVE OFFER BAR
    // =========================


    // -------------------------
    // 0–3 FRAME 
    // -------------------------

    if (count < 3) {

        const remaining = 3 - count;

        offerCount.innerText =
            `${count} / 3 Frames`;

        offerText.innerText =
            `Add ${remaining} frame${remaining > 1 ? "s" : ""} to unlock FREE SHIPPING`;

        offerApply.innerText =
            ``;

        offerApply2.innerText =
            ``;

        // Progress: 0 → 100%
        offerBar.style.width =
            (count / 3 * 100) + "%";

    }


    // -------------------------
    // 4–5 FRAMES 
        // free shipping
    // -------------------------

    


    else if (count < 6) {

        const remaining = 6 - count;

        offerCount.innerText =
            `${count} / 6 Frames`;

        offerText.innerText =
            `Free delivery Unlocked.Add ${remaining} more frame${remaining > 1 ? "s" : ""} to get 20% OFF`;

        offerApply.innerText =
            ``;

        offerApply2.innerText =
            `Offer applyd `;
        offerApply3.innerText =
            `Free delivery`;
        // Progress starts from 4 and goes to 8
        offerBar.style.width =
            (count / 6 * 100) + "%";

    }
    // -------------------------
    // 6+ FRAMES
    // 20% OFF + FREE SHIPPING
    // -------------------------

    else {

        offerCount.innerText =
            `${count} Frames`;

        offerText.innerText =
            `🎉 20% Off + Free delivery Unlocked`;

        offerApply.innerText =
            `20% off`;

        offerApply2.innerText =
            `Offer applyd `;
        offerApply3.innerText =
            `Free delivery`;
        offerBar.style.width =
            "100%";

    }


    // =========================
    // EMPTY CART
    // =========================

    if (count === 0) {

        document.getElementById("shippingPrice").innerText =
            "₹0";

        document.getElementById("offerSave").innerText =
            "-₹0";

        document.getElementById("grandTotal").innerText =
            "₹0";

        document.getElementById("grandTotal1").innerText =
            "₹0";

        document.getElementById("bottomTotal").innerText =
            "₹0";

        offerCount.innerText =
            "0 / 3 Frames";

        offerText.innerText =
            "Add 3 frames to unlock FREE SHIPPING";

        offerApply.innerText =
            "";

        offerApply2.innerText =
            "";
        offerApply3.innerText =
            ``;
        offerBar.style.width =
            "0%";


        cartBox.classList.remove("open");

        cartOverlay.classList.remove("show");

        document.body.style.overflow = "";

        cartHeader.style.display = "none";

    }

    else {

        cartHeader.style.display = "flex";

    }

}
window.addEventListener("DOMContentLoaded", () => {

    renderCart();

});
function removeItem(id) {

    delete cart[id];

    saveCart();

    renderCart();

}
function showToast(message){

    const toast = document.getElementById("toast");

    toast.innerText = message;

    toast.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(function(){

        toast.classList.remove("show");

    },2000);

}
function checkoutCart() {

    const products = getCartProducts();

    if (products.length === 0) {
        showToast("No products in cart");
        return;
    }

    let total = 0;
    let count = 0;

    let message = "🛒 *Hi - Diecast.scape*%0A%0A";


    // =========================
    // PRODUCTS
    // =========================

    products.forEach(item => {

        const subTotal = item.price * item.qty;

        total += subTotal;
        count += item.qty;

        message += `• ${item.name}%0A`;
        message += `₹${item.price} × ${item.qty} = ₹${subTotal}%0A%0A`;

    });


    


    // Get shipping from new function
    const shipping = getShipping(count);


    
    let discount = 0;

    
    
    if (count >= 6) {

        discount = Math.round(total * 0.20);

}

    // =========================
    // GRAND TOTAL
    // =========================

    const grandTotal =
        total + shipping - discount;





    // =========================
    // WHATSAPP MESSAGE
    // =========================

    message += "━━━━━━━━━━━━━━%0A";

    message += `Total Frames : ${count}%0A`;

    message += `Product Total : ₹${total}%0A`;


    // Show FREE instead of ₹0 for 4+ frames
    if (count >= 4) {

        message += `Shipping : FREE%0A`;

    } else {

        message += `Shipping : ₹${shipping}%0A`;

    }


    message += `Discount : - ₹${discount}%0A`;


    message += "━━━━━━━━━━━━━━%0A";

    message +=
        `*Grand Total : ₹${grandTotal}*%0A%0A`;

    message +=
        "Share me payment option.";


    // =========================
    // OPEN WHATSAPP
    // =========================

    window.open(
        "https://wa.me/918792744018?text=" + message,
        "_blank"
    );

}
const cartBox = document.getElementById("cartBox");
const cartHeader = document.getElementById("cartHeader");
const cartOverlay = document.getElementById("cartOverlay");
const checkoutBtn = document.getElementById("checkoutBtn");
const clearCartBtn = document.getElementById("clearCartBtn");
cartHeader.addEventListener("click", () => {

    cartBox.classList.toggle("open");
if(cartBox.classList.contains("open")){
    cartOverlay.classList.add("show");
    document.body.style.overflow = "hidden";
}else{
    cartOverlay.classList.remove("show");
    document.body.style.overflow = "";
}
    

});


checkoutBtn.addEventListener("click", checkoutCart);

clearCartBtn.addEventListener("click", () => {

    if(!Object.keys(cart).length){
        showToast("Cart is already empty");
        return;
    }

    if(confirm("Remove this items?")){

        cart = {};

        saveCart();

        renderCart();

    }

});
