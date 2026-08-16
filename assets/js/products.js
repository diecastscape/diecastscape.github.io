
// ===== SEARCH =====
function searchProducts() {
  const input =
    document.getElementById("searchInput")
    ?.value
    .trim()
    .toLowerCase() || "";

  // Works for Diorama (.section), Frames & Accessories (.shop-card)
  const products = document.querySelectorAll(".section, .shop-card");

  products.forEach(product => {
    const title =
      product
        .querySelector(".diorama-title")
        ?.textContent
        .trim()
        .toLowerCase() || "";

    product.style.display =
      input === "" || title.includes(input)
        ? ""
        : "none";
  });
}

// Search again after Firebase products finish rendering
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

