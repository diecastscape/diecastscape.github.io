function searchProducts() {
  let input = document.getElementById("searchInput").value.toLowerCase();
  let sections = document.querySelectorAll(".section");
  sections.forEach(section => {
    let title = section.querySelector(".diorama-title").innerText.toLowerCase();
    section.style.display = title.includes(input) ? "block" : "none";
  });
}
function openLightbox(src) {
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  img.src = src;
  lightbox.style.display = "flex";
  history.pushState(null, "", "#image");
}
function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  lightbox.style.display = "none";
  history.back();
}
window.addEventListener("popstate", function () {
  document.getElementById("lightbox").style.display = "none";
}); 
function openMenu() {
  document.body.classList.add("menu-open");
}
function closeMenu() {
  document.body.classList.remove("menu-open");
}
document.addEventListener("DOMContentLoaded", function () {
  const toggleSwitch = document.querySelector(".toggle-switch");
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-theme");
    if (toggleSwitch) toggleSwitch.classList.add("active");
  }
  window.toggleThemeButton = function () {
    document.body.classList.toggle("light-theme");
    if (toggleSwitch) {
      toggleSwitch.classList.toggle("active");
    }
    localStorage.setItem(
      "theme",
      document.body.classList.contains("light-theme") ? "light" : "dark"
    );
  };
});
let activeDetails = null;
let activeButton = null;
function toggleDetails(btn) {
  const details = btn.nextElementSibling;
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
window.addEventListener("scroll", () => {
  if (!activeDetails) return;
  const rect = activeDetails.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    activeDetails.classList.remove("open");
    activeButton.innerHTML = activeButton.dataset.label + " ▾";
    activeDetails = null;
    activeButton = null;
  }
});
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
    }
  });
}, {
  threshold: 0.15
});
document.querySelectorAll(".section").forEach(sec => {
  observer.observe(sec);
});
// ===== SCROLL ANIMATION OBSERVER =====
let sectionObserver;

function initScrollAnimations() {
  const sections = document.querySelectorAll(".section");

  if (!("IntersectionObserver" in window)) {
    sections.forEach(el => el.classList.add("show"));
    return;
  }

  if (sectionObserver) sectionObserver.disconnect();

  sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        sectionObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15
  });

  sections.forEach(section => sectionObserver.observe(section));
}

// run for index.html normal content
document.addEventListener("DOMContentLoaded", initScrollAnimations);
