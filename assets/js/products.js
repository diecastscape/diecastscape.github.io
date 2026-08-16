function searchProducts() {
  const input =
    document.getElementById("searchInput")
      ?.value
      .trim()
      .toLowerCase() || "";

  let products;
  let container;

  // DIORAMA PAGE
  if (document.getElementById("productsContainer")) {
    container = document.getElementById("productsContainer");

    products = document.querySelectorAll(
      "#productsContainer .section"
    );
  }

  // FRAME / ACCESSORIES PAGE
  else if (document.getElementById("sale-main")) {
    container = document.getElementById("sale-main");

    products = document.querySelectorAll(
      "#sale-main .shop-card"
    );
  }

  else {
    return;
  }

  let found = false;

  products.forEach(product => {

    const title =
      product
        .querySelector(".diorama-title, .diorama-title1")
        ?.textContent
        .trim()
        .toLowerCase() || "";

    if (input === "" || title.includes(input)) {
      product.style.display = "";
      
      if (input !== "") {
        found = true;
      }

    } else {
      product.style.display = "none";
    }
  });


  // Remove old message
  const oldMessage = container.querySelector(".no-products-message");

  if (oldMessage) {
    oldMessage.remove();
  }


  // Show message if search has no results
  if (input !== "" && !found) {

    const message = document.createElement("div");

    message.className = "no-products-message";
    message.textContent = "No matching products found";

    container.appendChild(message);
  }
}


// Run after Firebase products are rendered
window.addEventListener("load", () => {
  setTimeout(searchProducts, 1000);
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

