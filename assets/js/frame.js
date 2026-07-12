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
function getShipping(count){

    const weight = count * 135; // grams per frame

    if(weight <= 990) return 62;
    if(weight <= 1490) return 80;
    if(weight <= 1990) return 100;
    if(weight <= 2490) return 118;
    if(weight <= 2990) return 136;
    if(weight <= 3490) return 156;
    if(weight <= 3990) return 174;

    return 212;
}
function renderCart() {

    const list = document.getElementById("cartItems");
    list.innerHTML = "";
    let total = 0;
    let count = 0;
    let shipping = 0;
    getCartProducts().forEach(item => {

        total += item.price * item.qty;

        count += item.qty;

        list.innerHTML += `
        <div class="cart-item">

            <div class="cart-row">

                <div class="cart-name">

                    ${item.name}:l

                </div>
                

                <div class="cart-price">

                ${item.price}×${item.qty}:-    ₹${item.price * item.qty}

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

    const offerBar = document.getElementById("offerBar");
const offerCount = document.getElementById("offerCount");
const offerText = document.getElementById("offerText");
const offerApply = document.getElementById("offerApply");
const offerApply2 = document.getElementById("offerApply2");
const bottomTotal2 = document.getElementById("bottomTotal2")
const bottomTotal = document.getElementById("bottomTotal")
const offerSave = document.getElementById("offerSave");
const offers = [
    {count:3, discount:20},
    {count:6, discount:30},
    {count:10, discount:35}
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
const finalPrice = Math.round(total * 1);
    shipping = getShipping(count);
const grandTotal = finalPrice + shipping;
const finalSave = Math.round(total * 0);
    offerCount.innerText = `${count} / 3 Frames`;
    offerText.innerText =
    `Add ${3-count} frame${3-count>1?"s":""} to unlock 20% OFF`;
offerApply.innerText =
    `Fill cart for discount `;
    offerApply2.innerText =
    `Fill cart for discount`;
    offerBar.style.width = (count/3*100)+"%";
    offerSave.innerHTML =
    `₹${finalSave}`;
bottomTotal.innerHTML = `₹${total}`;
  document.getElementById("shippingPrice").innerHTML = `₹${shipping}`;
document.getElementById("grandTotal").innerHTML = `₹${grandTotal}`;  
}

else if(count < 6){
const finalPrice = Math.round(total * 0.80);
    shipping = getShipping(count);
const grandTotal = finalPrice + shipping;
const finalSave = Math.round(total * 0.20);
    offerCount.innerText = `${count} / 6 Frames`;
    offerText.innerHTML =
    ` Add ${6-count} more for 30% OFF`;
     offerApply.innerText =
    `✓ 20% OFF Applied`;
    offerApply2.innerText =
    `✓ 20% OFF Applied`;
    offerBar.style.width = (count/6*100)+"%";
bottomTotal.innerHTML =
    `₹${finalPrice}`;
document.getElementById("shippingPrice").innerHTML = `₹${shipping}`;
document.getElementById("grandTotal").innerHTML = `₹${grandTotal}`;
offerSave.innerHTML =
    `₹${finalSave}`;
}

else if(count < 10){
const finalPrice = Math.round(total * 0.70);
    shipping = getShipping(count);
const grandTotal = finalPrice + shipping;
const finalSave = Math.round(total * 0.30);
    offerCount.innerText = `${count} / 10 Frames`;
    offerText.innerHTML =
    `Add ${10-count} more for 35% OFF`;
offerApply.innerText =
    `✓ 30% OFF Applied`;
    offerApply2.innerText =
    `✓ 30% OFF Applied`;
    offerBar.style.width = (count/10*100)+"%";
bottomTotal.innerHTML =
    `₹${finalPrice}`;
    document.getElementById("shippingPrice").innerHTML = `₹${shipping}`;
document.getElementById("grandTotal").innerHTML = `₹${grandTotal}`;
offerSave.innerHTML =
    `₹${finalSave}`;
}

else{
const finalPrice = Math.round(total * 0.65);
    shipping = getShipping(count);
const grandTotal = finalPrice + shipping;
const finalSave = Math.round(total * 0.35);
    offerCount.innerText = `${count} Frames`;
    offerText.innerHTML =
    `🎉 Maximum OFF Unlocked`;
offerApply.innerText =
    `✓ 35% OFF Applied`;
    offerApply2.innerText =
    `✓ 35% OFF Applied`;
    offerBar.style.width = "100%";
bottomTotal.innerHTML =
    `₹${finalPrice}`;
    document.getElementById("shippingPrice").innerHTML = `₹${shipping}`;
document.getElementById("grandTotal").innerHTML = `₹${grandTotal}`;
offerSave.innerHTML =
    `₹${finalSave}`;
}


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
