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

  // Apply saved theme
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-theme");
    if (toggleSwitch) toggleSwitch.classList.add("active");
  }

  // Toggle theme (global)
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
