/* ============================================================
   Boulevard Cosmos — motion system
   Vanilla JS, no dependencies. Everything here is enhancement:
   the page reads correctly with this file absent or inert.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isDesktop = window.matchMedia("(min-width: 900px)");

  // Content is visible by default in the CSS (no-JS, blocked-JS and crawler
  // renders always see full content). Only once JS has actually run do we
  // opt in to the hidden-then-reveal treatment.
  document.documentElement.classList.add("js-ready");

  if (reduceMotion) {
    document.documentElement.classList.add("motion-reduced");
  }

  /* ---------- shared helpers ---------- */

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // 0 -> 1 progress of an element passing through the viewport
  // (0 as it first touches the bottom edge, 1 as it clears the top edge)
  function sectionProgress(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    return clamp((vh - rect.top) / (vh + rect.height), 0, 1);
  }

  /* ---------- 1. one-shot reveal (fade / scale) ---------- */

  function watchReveal(targets, options) {
    if (!targets.length) return;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      targets.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = el.getAttribute("data-reveal-delay") || "0";
          el.style.setProperty("--reveal-delay", delay + "ms");
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      });
    }, options);

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initReveal() {
    var all = Array.prototype.slice.call(document.querySelectorAll("[data-reveal], [data-reveal-scale]"));
    var fast = [];
    var normal = [];
    all.forEach(function (el) {
      (el.closest("[data-fast-reveal]") ? fast : normal).push(el);
    });

    // Trigger once the element has actually started entering the viewport
    // (a small negative bottom margin + ~12% visible), not 15-35% of a
    // screen-height before it — otherwise the transition finishes off-screen
    // and the element just appears "already there" with nothing to see.
    watchReveal(normal, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    // Fast lane ("How Star answers"): still the earliest of the two, and
    // paired with a shorter CSS duration/offset via [data-fast-reveal]'s
    // custom-property overrides (see styles.css) — but still starts once
    // the element is genuinely on-screen, not a screen-height early.
    watchReveal(fast, { threshold: 0.1, rootMargin: "0px" });

    // Safety net, not the primary mechanism: force-reveal anything already
    // sitting inside the viewport that the observer hasn't caught (e.g. a
    // direct #anchor jump landing mid-page, where nothing ever crosses the
    // IntersectionObserver's boundary). This is a fixed, short sequence of
    // checks — not a scroll listener — because a browser's fragment-scroll
    // on load isn't guaranteed to have settled by the first animation frame;
    // it can still be adjusting a few hundred ms later. Once this sequence
    // ends, anything not yet revealed is left to the normal observers, which
    // keep watching indefinitely as the user scrolls.
    function sweepViewport() {
      all.forEach(function (el) {
        if (el.classList.contains("is-visible")) return;
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          var delay = el.getAttribute("data-reveal-delay") || "0";
          el.style.setProperty("--reveal-delay", delay + "ms");
          el.classList.add("is-visible");
        }
      });
    }
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(sweepViewport);
    });
    [250, 600, 1200].forEach(function (delay) {
      window.setTimeout(sweepViewport, delay);
    });
  }

  /* ---------- 2. hero orbit line-draw ---------- */

  function initOrbit() {
    var orbit = document.querySelector(".hero-orbit");
    if (!orbit) return;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      orbit.classList.add("is-visible");
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            orbit.classList.add("is-visible");
            observer.unobserve(orbit);
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(orbit);
  }

  /* ---------- shared per-frame engine ---------- */

  var activeUpdaters = new Set();
  var rafId = null;

  function tick() {
    activeUpdaters.forEach(function (fn) {
      fn();
    });
    if (activeUpdaters.size > 0) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function ensureLoop() {
    if (rafId === null) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function registerScrollDriven(el, updater, options) {
    if (!("IntersectionObserver" in window)) {
      activeUpdaters.add(updater);
      ensureLoop();
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            activeUpdaters.add(updater);
            ensureLoop();
          } else {
            activeUpdaters.delete(updater);
          }
        });
      },
      options || { rootMargin: "20% 0px 20% 0px" }
    );
    observer.observe(el);
  }

  /* ---------- 3. depth / parallax (desktop only, restrained) ---------- */

  function initDepth() {
    if (reduceMotion || !isDesktop.matches) return;
    var scopes = document.querySelectorAll("[data-depth-scope]");
    scopes.forEach(function (scope) {
      var cards = scope.querySelectorAll("[data-depth]");
      if (!cards.length) return;
      var updater = function () {
        var p = sectionProgress(scope) - 0.5; // -0.5 .. 0.5
        cards.forEach(function (card) {
          var dy = parseFloat(card.getAttribute("data-depth-y") || "0");
          var dx = parseFloat(card.getAttribute("data-depth-x") || "0");
          var dr = parseFloat(card.getAttribute("data-depth-r") || "0");
          var ds = parseFloat(card.getAttribute("data-depth-s") || "0");
          card.style.setProperty("--depth-y", (p * dy).toFixed(2) + "px");
          card.style.setProperty("--depth-x", (p * dx).toFixed(2) + "px");
          card.style.setProperty("--depth-r", (p * dr).toFixed(2) + "deg");
          card.style.setProperty("--depth-s", (1 + p * ds).toFixed(3));
        });
      };
      registerScrollDriven(scope, updater);
    });
  }

  /* ---------- 4. threshold (Boulevard Cosmos -> Star) ---------- */

  function initThreshold() {
    var section = document.getElementById("threshold");
    if (!section) return;
    if (reduceMotion) {
      section.style.setProperty("--t", "1");
      return;
    }
    var updater = function () {
      var t = sectionProgress(section);
      section.style.setProperty("--t", t.toFixed(3));
    };
    registerScrollDriven(section, updater, { rootMargin: "0px" });
  }

  /* ---------- 5. converging panels (Chapter 6) ---------- */

  function initConverge() {
    var section = document.querySelector("[data-converge]");
    if (!section || reduceMotion || !isDesktop.matches) return;
    var left = section.querySelector("[data-converge-left]");
    var right = section.querySelector("[data-converge-right]");
    if (!left || !right) return;
    var amplitude = 46;
    var updater = function () {
      var p = clamp(sectionProgress(section) * 1.4, 0, 1);
      var offset = (1 - p) * amplitude;
      left.style.setProperty("--depth-x", "-" + offset.toFixed(2) + "px");
      right.style.setProperty("--depth-x", offset.toFixed(2) + "px");
    };
    registerScrollDriven(section, updater);
  }

  /* ---------- 6. nav chrome on scroll ---------- */

  function initNav() {
    var nav = document.getElementById("site-nav");
    if (!nav) return;
    var onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 7. intent-to-action confirmation (Chapter 4) ---------- */

  function initConfirm() {
    var card = document.querySelector("[data-confirm-card]");
    if (!card) return;
    var button = card.querySelector("[data-confirm-btn]");
    if (!button) return;
    button.addEventListener("click", function () {
      card.querySelectorAll(".action-card-state").forEach(function (state) {
        state.classList.toggle("is-current", state.hasAttribute("data-state-executed"));
      });
      button.setAttribute("disabled", "true");
    });
  }

  /* ---------- boot ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initOrbit();
    initDepth();
    initThreshold();
    initConverge();
    initNav();
    initConfirm();
  });
})();
