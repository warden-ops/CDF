/* Menu, défilement horizontal, parallaxe légère. Aucune librairie. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("menu");
  var label = document.getElementById("menu-label");
  var mast = document.querySelector(".mast");

  function setMenu(open) {
    if (!mast || !toggle) return;
    mast.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (label) label.textContent = open ? "Fermer le menu" : "Ouvrir le menu";
    document.body.classList.toggle("menu-open", open);
  }

  if (toggle && mast) {
    toggle.addEventListener("click", function () {
      setMenu(!mast.classList.contains("is-open"));
    });
  }
  if (menu) {
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });
  }
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setMenu(false);
  });

  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var track = root.querySelector("[data-track]");
    if (!track) return;
    root.addEventListener("click", function (event) {
      var button = event.target.closest("[data-dir]");
      if (!button) return;
      var card = track.querySelector("li");
      var gap = parseFloat(window.getComputedStyle(track).columnGap || window.getComputedStyle(track).gap) || 0;
      var delta = card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
      track.scrollBy({
        left: Number(button.getAttribute("data-dir")) * delta,
        behavior: reduce.matches ? "auto" : "smooth"
      });
    });
  });

  var heroImg = document.querySelector(".hero-media img");
  var ticking = false;
  function parallax() {
    ticking = false;
    if (!heroImg || reduce.matches) return;
    var y = window.scrollY || 0;
    if (y > window.innerHeight) return;
    heroImg.style.transform = "translate3d(0," + (y * 0.22) + "px,0) scale(1.08)";
  }
  if (heroImg && !reduce.matches) {
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(parallax);
    }, { passive: true });
  }

  var extra = document.createElement("style");
  extra.textContent =
    "#cdf-guide-inline{position:relative;z-index:2;margin-top:-2.4rem;border-radius:2rem 2rem 0 0;background:#fff}" +
    "#cdf-guide-inline h2{font-family:\"Playfair Display\",Georgia,serif}";
  document.head.appendChild(extra);
})();
