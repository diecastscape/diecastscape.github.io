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
  const savedTheme = localStorage.getItem("theme") || "dark";

  if (savedTheme === "light") {
    document.documentElement.classList.add("light");
    toggleSwitches.forEach(sw => sw.classList.add("active"));
  } else {
    document.documentElement.classList.remove("light");
    toggleSwitches.forEach(sw => sw.classList.remove("active"));
  }
}

// Run on page load
document.addEventListener("DOMContentLoaded", initTheme);

// Global toggle function
window.toggleThemeButton = function () {
  document.documentElement.classList.toggle("light");

  const isLight = document.documentElement.classList.contains("light");

  document.querySelectorAll(".toggle-switch").forEach(sw => {
    isLight ? sw.classList.add("active") : sw.classList.remove("active");
  });

  localStorage.setItem("theme", isLight ? "light" : "dark");
};

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


const slides=[

{
img:"/images/a624a02a-c19c-4d00-9c11-dd2e19d7a545.webp",
title:"Miniature Display",
desc:"Handcrafted premium display setup.",
url:"/products/diorama/"
},

{
img:"/images/custom-available.webp",
title:"Custom Build",
desc:"Build your dream display.",
url:"/products/diorama/"
},

{
img:"/images/frames-display.webp",
title:"Photo Frames",
desc:"Frame your collection.",
url:"/products/frames/"
}

];

let current=0;

function rotateShowcase(){

current=
(current+1)
%
slides.length;

document
.getElementById(
"showcaseImage"
)
.src=
slides[current].img;

document
.getElementById(
"showcaseTitle"
)
.textContent=
slides[current].title;

document
.getElementById(
"showcaseDesc"
)
.textContent=
slides[current].desc;

document
.getElementById(
"showcaseLink"
)
.href=
slides[current].url;

}

setInterval(
rotateShowcase,
4000
);
