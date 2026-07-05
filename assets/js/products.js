// ===== SEARCH =====
// ===== SEARCH =====
function searchProducts() {
  const input =
    document.getElementById("searchInput")
    ?.value
    .trim()
    .toLowerCase() || "";

  const sections = document.querySelectorAll(".section");

  sections.forEach(section => {
    const title =
      section
      .querySelector(".diorama-title")
      ?.textContent
      .trim()
      .toLowerCase() || "";

    section.style.display =
      input === "" || title.includes(input)
        ? ""
        : "none";
  });
}

// Search again after firebase products finish rendering
window.addEventListener("load", () => {
  setTimeout(searchProducts, 300);
});
// ===== LIGHTBOX (Optimized HQ Loader) =====
function openLightbox(src) {
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  if (!lightbox || !img) return;

  img.src = ""; // reset to avoid flash
  lightbox.style.display = "flex";

  const highRes = new Image();
  highRes.onload = () => {
    img.src = highRes.src;
  };
  highRes.src = src;

  history.pushState(null, "", "#image");
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  lightbox.style.display = "none";
  if (location.hash === "#image") history.back();
}

window.addEventListener("popstate", function () {
  const lightbox = document.getElementById("lightbox");
  if (lightbox) lightbox.style.display = "none";
});

function openDetailsSheet(btn) {
  const details = btn.nextElementSibling; // .product-details
  const content = details.innerHTML;

  document.getElementById("sheetContent").innerHTML = content;
  document.getElementById("sheetOverlay").classList.add("show");
  document.getElementById("bottomSheet").classList.add("show");

  document.body.style.overflow = "hidden"; // lock background scroll
}

function closeSheet() {
  document.getElementById("sheetOverlay").classList.remove("show");
  document.getElementById("bottomSheet").classList.remove("show");
  document.body.style.overflow = "";
}
// ===========================
// ACCESSORIES CART
// ===========================

let cart = JSON.parse(localStorage.getItem("accessoriesCart")) || {};

function saveCart() {
  localStorage.setItem(
    "accessoriesCart",
    JSON.stringify(cart)
  );
}

function changeQty(id, change) {

  if (!cart[id]) {
    cart[id] = {
      qty: 0,
      name: "",
      price: 0
    };
  }

  cart[id].qty += change;

  if (cart[id].qty <= 0) {
    delete cart[id];
  }

  const qty = cart[id] ? cart[id].qty : 0;

  const qtyBox = document.getElementById("qty-" + id);

  if (qtyBox) qtyBox.innerText = qty;

  saveCart();

  updateCartBar();
}

function addProductInfo(id, name, price) {

  if (!cart[id]) {

    cart[id] = {
      qty: 0,
      name: name,
      price: price
    };

  } else {

    cart[id].name = name;
    cart[id].price = price;

  }

}

function updateCartBar() {

  const bar = document.getElementById("cartBar");

  const totalBox =
    document.getElementById("cartTotal");

  const countBox =
    document.getElementById("cartCount");

  let total = 0;

  let count = 0;

  Object.values(cart).forEach(item => {

    total += item.price * item.qty;

    count += item.qty;

  });

  totalBox.innerText = "₹" + total;

  countBox.innerText =
    count + " Items";

  
}
function toggleCartDetails(){

const box =
document.getElementById("cartDetails");

box.classList.toggle("show");

renderCartDetails();

}

function renderCartDetails(){

let html = "";
let total = 0;

Object.keys(cart).forEach(id=>{

const item = cart[id];

const lineTotal =
item.price * item.qty;

total += lineTotal;

html += `
<div class="cart-item">

<div>
${item.name}
x ${item.qty}
</div>

<div>
₹${lineTotal}
</div>

</div>
`;

});

document.getElementById(
"cartItemsList"
).innerHTML = html;

document.getElementById(
"detailsTotal"
).innerText = "₹"+total;

}
// ===========================
// RESTORE CART
// ===========================

function restoreCart() {

  Object.keys(cart).forEach(id => {

    const qty =
      document.getElementById("qty-" + id);

    if (qty) {

      qty.innerText = cart[id].qty;

    }

  });

  updateCartBar();

}


// ===========================
// CHECKOUT
// ===========================

function checkoutCart(){

let message =
`Hi Diecast.scape,

I'd like to order these accessories.

`;

let total = 0;
let totalItems = 0;

Object.values(cart).forEach(item=>{

message +=
`• ${item.name}
Qty : ${item.qty}
₹${item.price} × ${item.qty} = ₹${item.price*item.qty}

`;

total += item.price*item.qty;

totalItems += item.qty;

});

message +=
`-------------------------

Total Items : ${totalItems}

Total Amount : ₹${total}

`;

const url =
"https://wa.me/918792744018?text="
+ encodeURIComponent(message);

window.open(url,"_blank");

}
