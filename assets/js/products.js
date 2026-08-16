function searchProducts() {
  const input =
    document.getElementById("searchInput")
      ?.value
      .trim()
      .toLowerCase() || "";

  let products;

  // Diorama page
  if (document.querySelector(".section")) {
    products = document.querySelectorAll(".section");
  }

  // Frames / Accessories page
  else if (document.querySelector(".shop-card")) {
    products = document.querySelectorAll(".shop-card");
  }

  else {
    return;
  }

  products.forEach(product => {

    const title =
      product.querySelector(".diorama-title")
        ?.textContent
        .trim()
        .toLowerCase() || "";

    product.style.display =
      input === "" || title.includes(input)
        ? ""
        : "none";
  });
}

// Firebase may take some time to render products
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

