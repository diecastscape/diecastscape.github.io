// ===============================
// VIEW CART SHEET
// ===============================

const viewHandle = document.getElementById("viewCartHandle");
const cartSheet = document.getElementById("cartSheet");

if(viewHandle){

viewHandle.onclick = ()=>{

cartSheet.classList.toggle("show");

viewHandle.innerHTML =
cartSheet.classList.contains("show")
? "Hide Cart ▼"
: "View Cart ▲";

};

}

// ===============================
// BUILD CART ITEMS
// ===============================

function renderCartItems(){

const list =
document.getElementById("cartItems");

if(!list) return;

list.innerHTML = "";

let total = 0;
let count = 0;

Object.keys(cart).forEach(id=>{

const item = cart[id];

total += item.price * item.qty;
count += item.qty;

list.insertAdjacentHTML(
"beforeend",
`

<div class="cart-item">

<div class="cart-item-info">

<div class="cart-item-name">

${item.name}

</div>

<div class="cart-item-price">

₹${item.price} × ${item.qty}

</div>

</div>

<button
class="remove-btn"
onclick="removeCartItem('${id}')">

Remove

</button>

</div>

`
);

});

document.getElementById("sheetProductCount").innerText = count;
document.getElementById("sheetTotal").innerText = total;

}

// ===============================
// REMOVE ITEM
// ===============================

window.removeCartItem = function(id){

delete cart[id];

saveCart();

restoreCart();

renderCartItems();

};

// ===============================
// CLEAR CART
// ===============================

window.clearCart = function(){

if(Object.keys(cart).length==0) return;

if(!confirm("Clear all selected products?"))
return;

cart={};

saveCart();

restoreCart();

renderCartItems();

};

// ===============================
// UPDATE BAR
// ===============================

const oldUpdateCartBar = updateCartBar;

updateCartBar = function(){

oldUpdateCartBar();

renderCartItems();

const checkout =
document.getElementById("checkoutBtn");

let items = 0;

Object.values(cart).forEach(i=>{
items += i.qty;
});

if(items==0){

document.getElementById("cartCount")
.innerText="Add Items";

checkout.style.opacity=".5";

}else{

checkout.style.opacity="1";

}

};

// ===============================
// CHECKOUT
// ===============================

const oldCheckout = checkoutCart;

checkoutCart = function(){

let items = 0;

Object.values(cart).forEach(i=>{
items += i.qty;
});

if(items==0){

const pop =
document.getElementById("cartPopup");

pop.classList.add("show");

setTimeout(()=>{

pop.classList.remove("show");

},2000);

return;

}

oldCheckout();

};

// ===============================
// INITIAL LOAD
// ===============================

window.addEventListener("DOMContentLoaded",()=>{

restoreCart();

renderCartItems();

});
