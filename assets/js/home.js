
import { loadPopularProducts } from "./home-firebase.js";


// =====================================================
// HERO SLIDER
// =====================================================

let currentHero = 0;

function showHero(index) {

  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");

  if (!slides.length) return;

  if (index >= slides.length) {
    currentHero = 0;
  } else if (index < 0) {
    currentHero = slides.length - 1;
  } else {
    currentHero = index;
  }

  slides.forEach((slide, i) => {
    slide.classList.toggle(
      "active",
      i === currentHero
    );
  });

  dots.forEach((dot, i) => {
    dot.classList.toggle(
      "active",
      i === currentHero
    );
  });

}


// =====================================================
// HERO CONTROLS
// =====================================================

window.changeHero = function(direction) {
  showHero(currentHero + direction);
};


window.goHero = function(index) {
  showHero(index);
};


// =====================================================
// AUTO SLIDE
// =====================================================

setInterval(() => {
  showHero(currentHero + 1);
}, 6000);


// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  showHero(0);

  loadPopularProducts();

});


