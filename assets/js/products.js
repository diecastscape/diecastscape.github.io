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

