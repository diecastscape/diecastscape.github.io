import { loadPopularProducts } from "./home-firebase.js";

let currentHero = 0;
let heroTimer = null;
const HERO_INTERVAL = 6500;

function showHero(index) {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");
  if (!slides.length) return;
  currentHero = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => {
    const active = i === currentHero;
    slide.classList.toggle("active", active);
    slide.setAttribute("aria-hidden", String(!active));
  });
  dots.forEach((dot, i) => {
    const active = i === currentHero;
    dot.classList.toggle("active", active);
    if (active) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });
}

function stopHeroAutoplay() {
  if (heroTimer) window.clearInterval(heroTimer);
  heroTimer = null;
}
function startHeroAutoplay() {
  stopHeroAutoplay();
  if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  heroTimer = window.setInterval(() => showHero(currentHero + 1), HERO_INTERVAL);
}
window.changeHero = direction => { showHero(currentHero + direction); startHeroAutoplay(); };
window.goHero = index => { showHero(index); startHeroAutoplay(); };

document.addEventListener("DOMContentLoaded", () => {
  const slider = document.getElementById("heroSlider");
  showHero(0);
  startHeroAutoplay();
  loadPopularProducts();

  if (slider) {
    slider.addEventListener("mouseenter", stopHeroAutoplay);
    slider.addEventListener("mouseleave", startHeroAutoplay);
    slider.addEventListener("focusin", stopHeroAutoplay);
    slider.addEventListener("focusout", startHeroAutoplay);
    let startX = 0, startY = 0;
    slider.addEventListener("touchstart", event => {
      if (!event.touches.length) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      stopHeroAutoplay();
    }, { passive:true });
    slider.addEventListener("touchend", event => {
      if (!event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - startX;
      const dy = event.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) showHero(currentHero + (dx < 0 ? 1 : -1));
      startHeroAutoplay();
    }, { passive:true });
  }
  document.addEventListener("visibilitychange", () => document.hidden ? stopHeroAutoplay() : startHeroAutoplay());
});
