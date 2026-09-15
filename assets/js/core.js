/* =====================================================
   SIDE MENU
===================================================== */

function openMenu() {

  document.body.classList.add("menu-open");

  document.body.style.overflow = "hidden";

}


function closeMenu() {

  document.body.classList.remove("menu-open");

  document.body.style.overflow = "";

}


/* =====================================================
   ESC KEY
===================================================== */

document.addEventListener("keydown", function (event) {

  if (event.key === "Escape") {
    closeMenu();
  }

});


/* =====================================================
   FAQ
===================================================== */

document.querySelectorAll(".faq-question").forEach(function (btn) {

  btn.addEventListener("click", function () {

    const item = btn.parentElement;

    const isOpen = item.classList.contains("active");


    document.querySelectorAll(".faq-item").forEach(function (i) {

      i.classList.remove("active");

    });


    if (!isOpen) {

      item.classList.add("active");

    }

  });

});


/* =====================================================
   BREADCRUMB
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  const current =
    document.querySelector(".breadcrumb-current");

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
