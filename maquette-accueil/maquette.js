/* Carrousels, menu et apparition au défilement. Aucune librairie. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  function stepOf(track) {
    var card = track.querySelector("li");
    if (!card) return Math.max(240, track.clientWidth * 0.8);
    var styles = window.getComputedStyle(track);
    var gap = parseFloat(styles.columnGap || styles.gap) || 16;
    return card.getBoundingClientRect().width + gap;
  }

  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var track = root.querySelector(".track");
    if (!track) return;
    root.addEventListener("click", function (event) {
      var button = event.target.closest("[data-dir]");
      if (!button) return;
      track.scrollBy({
        left: Number(button.getAttribute("data-dir")) * stepOf(track),
        behavior: reduce ? "auto" : "smooth"
      });
    });
  });

  if (reduce || !("IntersectionObserver" in window)) return;

  var nodes = document.querySelectorAll(".reveal");
  if (!nodes.length) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -6% 0px" }
  );

  nodes.forEach(function (node) {
    var rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) node.classList.add("is-in");
    node.classList.add("is-armed");
    observer.observe(node);
  });
})();
