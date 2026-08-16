function searchProducts() {
  const input =
    document.getElementById("searchInput")
      ?.value
      .trim()
      .toLowerCase() || "";

  let products;

  // DIORAMA PAGE
  if (document.getElementById("productsContainer")) {
    products = document.querySelectorAll(
      "#productsContainer .section"
    );
  }

  // FRAME / ACCESSORIES PAGE
  else if (document.getElementById("sale-main")) {
    products = document.querySelectorAll(
      "#sale-main .shop-card"
    );
  }

  else {
    return;
  }

  products.forEach(product => {

    // Diorama uses .diorama-title
    // Frame/Accessories use .diorama-title1
    const title =
      product
        .querySelector(".diorama-title, .diorama-title1")
        ?.textContent
        .trim()
        .toLowerCase() || "";

    if (input === "" || title.includes(input)) {
      product.style.display = "";
    } else {
      product.style.display = "none";
    }

  });
}


// Run once after Firebase products are loaded
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

