
// ===== MENU =====
function openMenu() {
  document.body.classList.add("menu-open");
}
function closeMenu() {
  document.body.classList.remove("menu-open");
}
function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  if (!menu) return;
  menu.style.right = menu.style.right === "0px" ? "-280px" : "0px";
}

// ===== THEME =====
document.addEventListener("DOMContentLoaded", function () {
  const toggleSwitch = document.querySelector(".toggle-switch");

  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-theme");
    if (toggleSwitch) toggleSwitch.classList.add("active");
  }

  window.toggleThemeButton = function () {
    document.body.classList.toggle("light-theme");
    if (toggleSwitch) toggleSwitch.classList.toggle("active");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("light-theme") ? "light" : "dark"
    );
  };
});
document.querySelectorAll(".faq-question").forEach(btn => {
  btn.addEventListener("click", () => {
    const item = btn.parentElement;

    // Close other open FAQ
    document.querySelectorAll(".faq-item").forEach(i => {
      if (i !== item) i.classList.remove("active");
    });

    // Toggle current
    item.classList.toggle("active");

    // Smooth scroll to opened FAQ
    if (item.classList.contains("active")) {
      setTimeout(() => {
        item.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  });
});

