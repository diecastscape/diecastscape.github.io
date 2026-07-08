const CART_KEY = "diecastscape_cart";

let cart = JSON.parse(localStorage.getItem(CART_KEY)) || {};
function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function getCartProducts() {
    return Object.values(cart);
}
function addProductInfo(id, name, price) {

    if (!cart[id]) {

        cart[id] = {
            id,
            name,
            price,
            qty: 0
        };

    }

}
function changeQty(id, qty) {

    if (!cart[id]) return;

    cart[id].qty += qty;

    if (cart[id].qty <= 0) {

        delete cart[id];

    }

    saveCart();

    renderCart();

}
function renderCart() {

    const list = document.getElementById("cartItems");

    list.innerHTML = "";

    let total = 0;

    let count = 0;

    getCartProducts().forEach(item => {

        total += item.price * item.qty;

        count += item.qty;

        list.innerHTML += `
        <div class="cart-item">

            <div class="cart-row">

                <div class="cart-name">

                    ${item.name} ×${item.qty}

                </div>

                <div class="cart-price">

                    ₹${item.price * item.qty}

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

    document.getElementById("summaryCount").innerText = count;

    document.getElementById("summaryTotal").innerText = "₹" + total;

    document.getElementById("bottomCount").innerText =
        count ? count : "Add Items";

    document.getElementById("bottomTotal").innerText = total;

    document.getElementById("checkoutBtn").disabled =
        count === 0;
if(count===0){

    closeCart();

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
function openCart(){

    cartSheet.classList.add("show");

    cartOverlay.classList.add("show");

}
const cartSheet = document.getElementById("cartSheet");
const cartOverlay = document.getElementById("cartOverlay");
const cartHandle = document.getElementById("cartHandle");
constfunction openCart(){

    cartSheet.classList.add("show");

    cartOverlay.classList.add("show");

} 
function closeCart(){

    cartSheet.classList.remove("show");

    cartOverlay.classList.remove("show");

}
if(cartHandle){

    cartHandle.addEventListener("click", openCart);

}

if(cartOverlay){

    cartOverlay.addEventListener("click", closeCart);

}

if(cartSheet){

    cartSheet.addEventListener("touchstart", function(e){

        startY = e.touches[0].clientY;

    });

    cartSheet.addEventListener("touchend", function(e){

        let endY = e.changedTouches[0].clientY;

        if(endY - startY > 80){

            closeCart();

        }

    });

}
