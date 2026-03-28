function openMenu() {
  document.body.classList.add("menu-open");
  document.body.style.overflow = "hidden"; // stop background scroll
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  document.body.style.overflow = ""; // restore scroll
}

function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  if (!menu) return;
  menu.style.right = menu.style.right === "0px" ? "-280px" : "0px";
}
// ===== THEME =====
function initTheme() {
  const toggleSwitches = document.querySelectorAll(".toggle-switch");
  const savedTheme = localStorage.getItem("theme");
  
  // Apply saved theme to body
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    toggleSwitches.forEach(sw => sw.classList.add("active"));
  } else {
    document.body.classList.remove("light-theme");
    toggleSwitches.forEach(sw => sw.classList.remove("active"));
  }
}

// Run on page load
document.addEventListener("DOMContentLoaded", initTheme);

// Global toggle function
window.toggleThemeButton = function () {
  document.body.classList.toggle("light-theme");
  const isLight = document.body.classList.contains("light-theme");
  
  // Update ALL toggle switches
  document.querySelectorAll(".toggle-switch").forEach(sw => {
    isLight ? sw.classList.add("active") : sw.classList.remove("active");
  });
  
  // Save to localStorage
  localStorage.setItem("theme", isLight ? "light" : "dark");

document.querySelectorAll(".faq-question").forEach(btn => {
  btn.addEventListener("click", () => {
    const item = btn.parentElement;
    const isOpen = item.classList.contains("active");

    // Close all others
    document.querySelectorAll(".faq-item").forEach(i => {
      i.classList.remove("active");
    });

    // Toggle current
    if (!isOpen) {
      item.classList.add("active");
    }
  });
});
  document.addEventListener("DOMContentLoaded", () => {
    const current = document.querySelector(".breadcrumb-current");
    if (!current) return;

    const pageMap = {
      "/special-sale/": "Special Sale",
      "/faq/": "FAQ",
      "/about/": "About Us",
      "/privacy/": "Privacy Policy",
      "/shipping/": "Shipping Policy",
      "/return/": "Return & Cancellation",
      "/terms/": "Terms of Service",
      "/login/": "Login"
    };

    const path = location.pathname;
    if (pageMap[path]) {
      current.textContent = pageMap[path];
    }
  });

