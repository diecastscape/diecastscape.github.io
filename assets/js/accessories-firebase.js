import { db } from "./firebase-init.js";

import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function buildAccessoryHTML(p){
const imgs = p.images.map(im => `
<div class="img-box">
  <div class="img-loader"></div>

  <img
    src="/images/accessories/${im}.webp"
    onload="this.previousElementSibling.remove();this.style.opacity=1"
    style="opacity:0"
    onclick="openLightbox(this.src)">
</div>
`).join("");

return `

<div class="section"
data-name="${p.name}"
data-price="${p.price}">

<div class="diorama-title">
${p.name}
</div>

<div class="slider">
${imgs}
</div>

<div class="price">
<span class="new">₹${p.price}</span>
</div>

<div class="cart-controls">

<button
class="qty-btn"
onclick="
addProductInfo(
'${p.id}',
'${p.name}',
${p.price}
);
changeQty('${p.id}',1);
">

−

</button>

<span
class="qty"
id="qty-${p.id}">

0

</span>

<button
class="qty-btn"
onclick="changeQty('${p.id}',1)">

+

</button>

</div>

</div>

`;

}

async function loadAccessories(){

const container =
document.getElementById("productsContainer");

const loader =
document.getElementById("productsLoader");

if(!container) return;

const q=query(
collection(db,"accessories"),
orderBy("created","desc")
);

const snap=await getDocs(q);

let count=0;

snap.forEach(doc=>{

const p=doc.data();

p.id=doc.id;

if(p.active){

container.insertAdjacentHTML(
"beforeend",
buildAccessoryHTML(p)
);

count++;

}

});

requestAnimationFrame(()=>{

if(loader)
loader.remove();

});

if(count===0){

container.innerHTML=`
<div class="border-top">
<div class="sale-off">
No accessories available
</div>
</div>
`;

}

}

window.addEventListener(
"DOMContentLoaded",
loadAccessories
);
