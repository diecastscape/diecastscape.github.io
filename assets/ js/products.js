// ===== SEARCH =====
function searchProducts() {
  let input = document.getElementById("searchInput")?.value.toLowerCase() || "";
  let sections = document.querySelectorAll(".section");

  sections.forEach(section => {
    let titleEl = section.querySelector(".diorama-title");
    let title = titleEl ? titleEl.innerText.toLowerCase() : "";
    section.style.display = title.includes(input) ? "block" : "none";
  });
}


// ===== LIGHTBOX =====
function openLightbox(src) {
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  if (!lightbox || !img) return;
  img.src = src;
  lightbox.style.display = "flex";
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
// ===== SCROLL REVEAL =====
let sectionObserver;

function initScrollAnimations() {
  const sections = document.querySelectorAll(".section");

  if (!("IntersectionObserver" in window)) {
    sections.forEach(el => el.classList.add("show"));
    return;
  }

  if (!sectionObserver) {
    sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          sectionObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
  }

  sections.forEach(section => sectionObserver.observe(section));
}

// Call on normal pages
document.addEventListener("DOMContentLoaded", initScrollAnimations);

// Re-init when content is injected (Special Sale)
window.reInitProductAnimations = function () {
  initScrollAnimations();
};
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

