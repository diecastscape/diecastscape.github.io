
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


if(count===0){

    cartBox.classList.remove("open");

    cartHeader.style.display = "none";

}else{

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

    let message = "Hi Diecast.scape,%0A%0A";
    message += "I'd like to order these items.%0A%0A";

    let total = 0;
    let count = 0;

    products.forEach(item => {

        const subTotal = item.price * item.qty;

        total += subTotal;
        count += item.qty;

        message +=
`• ${item.name}%0AQty: ${item.qty}%0A₹${item.price} × ${item.qty} = ₹${subTotal}%0A%0A`;

    });

    message += "--------------------%0A";
    message += `Products: ${count}%0A`;
    message += `Total: ₹${total}%0A`;
    message += "Shipping Charges Applicable%0A%0A";
    message += "Please share payment details.";

    window.open(
        "https://wa.me/918792744018?text=" + message,
        "_blank"
    );

}
const cartBox = document.getElementById("cartBox");
const cartHeader = document.getElementById("cartHeader");
const checkoutBtn = document.getElementById("checkoutBtn");
const clearCartBtn = document.getElementById("clearCartBtn");
cartHeader.addEventListener("click", () => {
    cartBox.classList.toggle("open");
});

checkoutBtn.addEventListener("click", checkoutCart);

clearCartBtn.addEventListener("click", () => {

    if(!Object.keys(cart).length){
        showToast("Cart is already empty");
        return;
    }

    if(confirm("Remove all items?")){

        cart = {};

        saveCart();

        renderCart();

    }

});
const offerBar = document.getElementById("offerBar");
const offerCount = document.getElementById("offerCount");
const offerText = document.getElementById("offerText");

const offers = [
    {count:3, discount:10},
    {count:7, discount:20},
    {count:12, discount:30}
];

let previous = 0;
let next = offers[0];

for(const o of offers){

    if(count >= o.count){

        previous = o.count;

    }else{

        next = o;

        break;

    }

}

if(count < 3){

    offerCount.innerText = `${count} / 3 Frames`;

    offerText.innerText =
    `Add ${3-count} more frame${3-count>1?"s":""} to unlock 10% OFF`;

    offerBar.style.width = (count/3*100)+"%";

}

else if(count < 7){

    offerCount.innerText = `${count} / 7 Frames`;

    offerText.innerHTML =
    `✓ 10% OFF Applied • Add ${7-count} more for 20% OFF`;

    offerBar.style.width = (count/7*100)+"%";

}

else if(count < 12){

    offerCount.innerText = `${count} / 12 Frames`;

    offerText.innerHTML =
    `✓ 20% OFF Applied • Add ${12-count} more for 30% OFF`;

    offerBar.style.width = (count/12*100)+"%";

}

else{

    offerCount.innerText = `12 / 12 Frames`;

    offerText.innerHTML =
    `🎉 Maximum 30% OFF Unlocked`;

    offerBar.style.width = "100%";

}
