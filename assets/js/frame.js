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

    // Up to 3 frames = ₹100 shipping
    if (count <= 3) {
        return 100;
    }

    // 4 or more frames = FREE shipping
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
    if (count < 4) {

        discount = 0;

    }

    // 4–7 frames
    else if (count < 8) {

        discount = 0;

    }

    // 8+ frames
    else {

        discount = Math.round(total * 0.25);

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
        shipping === 0 && count >= 4
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
    // 0–3 FRAMES
    // Goal: FREE SHIPPING
    // -------------------------

    if (count < 4) {

        const remaining = 4 - count;

        offerCount.innerText =
            `${count} / 4 Frames`;

        offerText.innerText =
            `Add ${remaining} frame${remaining > 1 ? "s" : ""} to unlock FREE SHIPPING`;

        offerApply.innerText =
            ``;

        offerApply2.innerText =
            ``;

        // Progress: 0 → 100%
        offerBar.style.width =
            (count / 4 * 100) + "%";

    }


    // -------------------------
    // 4–7 FRAMES
    // Goal: 25% OFF
    // -------------------------

    else if (count < 8) {

        const remaining = 8 - count;

        offerCount.innerText =
            `${count} / 8 Frames`;

        offerText.innerText =
            `Free delivery Unlocked.Add ${remaining} more frame${remaining > 1 ? "s" : ""} to get 25% OFF`;

        offerApply.innerText =
            ``;

        offerApply2.innerText =
            `Offer applyd `;
        offerApply3.innerText =
            `Free delivery`;
        // Progress starts from 4 and goes to 8
        offerBar.style.width =
            (count / 8 * 100) + "%";

    }


    // -------------------------
    // 8+ FRAMES
    // 25% OFF + FREE SHIPPING
    // -------------------------

    else {

        offerCount.innerText =
            `${count} Frames`;

        offerText.innerText =
            `🎉 25% Off + Free delivery Unlocked`;

        offerApply.innerText =
            `25% off`;

        offerApply2.innerText =
            `Offer applyd `;

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
            "0 / 4 Frames";

        offerText.innerText =
            "Add 4 frames to unlock FREE SHIPPING";

        offerApply.innerText =
            "";

        offerApply2.innerText =
            "";

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

    if(products.length === 0){
        showToast("No products in cart");
        return;
    }

    let total = 0;
    let count = 0;

    let message = "🛒 *New Order - Diecast.scape*%0A%0A";

    products.forEach(item => {

        const subTotal = item.price * item.qty;

        total += subTotal;
        count += item.qty;

        message += `• ${item.name}%0A`;
        message += `Qty : ${item.qty}%0A`;
        message += `₹${item.price} × ${item.qty} = ₹${subTotal}%0A%0A`;

    });

    const shipping = getShipping(count);

    let discount = 0;

    if(count >= 10){
        discount = Math.round(total * 0.35);
    }else if(count >= 6){
        discount = Math.round(total * 0.30);
    }else if(count >= 3){
        discount = Math.round(total * 0.20);
    }

    const grandTotal = total + shipping - discount;

    message += "━━━━━━━━━━━━━━%0A";
    message += `📦 Frames : ${count}%0A`;
    message += `💰 Product Total : ₹${total}%0A`;
    message += `🚚 Shipping : ₹${shipping}%0A`;
    message += `🎁 Discount : -₹${discount}%0A`;
    message += `━━━━━━━━━━━━━━%0A`;
    message += `💵 *Grand Total : ₹${grandTotal}*%0A%0A`;
    message += "Please share payment details.";

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
