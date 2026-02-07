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

// ===== DETAILS TOGGLE =====
let activeDetails = null;
let activeButton = null;

function toggleDetails(btn) {
  const details = btn.nextElementSibling;
  if (!details) return;

  const isOpen = details.classList.contains("open");

  if (activeDetails && activeDetails !== details) {
    activeDetails.classList.remove("open");
    activeButton.innerHTML = activeButton.dataset.label + " ▾";
  }

  if (!isOpen) {
    details.classList.add("open");
    btn.innerHTML = btn.dataset.label + " ▴";
    activeDetails = details;
    activeButton = btn;
  } else {
    details.classList.remove("open");
    btn.innerHTML = btn.dataset.label + " ▾";
    activeDetails = null;
    activeButton = null;
  }
}

// Auto close when out of viewport (no jerk)
window.addEventListener("scroll", () => {
  if (!activeDetails) return;

  const rect = activeDetails.getBoundingClientRect();
  const isOut = rect.bottom < 80 || rect.top > window.innerHeight - 80;

  if (isOut) {
    activeDetails.classList.remove("open");
    activeButton.innerHTML = activeButton.dataset.label + " ▾";
    activeDetails = null;
    activeButton = null;
  }
});
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

