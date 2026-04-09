/* ============================================================
   PAGE TRANSITION — Cinematic 5-Stage Animation
   Inspired by SOUL Church — rebuilt with GSAP
   For: Ambassadors Assembly

   STAGES:
   1. Heavy Impact   — Giant "AMBASSADORS ASSEMBLY" on beige
   2. Shrink & Hold  — Scale down to normal, hold
   3. Edge Swap      — Brand slides left out, tagline slides in
   4. Circle Collapse— Beige circle shrinks to nothing, reveals site
   5. UI Entry       — Site content animates in (handled by index-page.js)

   ─── TIMING (adjust these) ─────────────────────────────────
   ============================================================ */

(function () {
  'use strict';

  // ── Configurable Durations (seconds) ────────────────────────
  var SCALE_DOWN      = 1.2;   // Stage 1→2: giant text shrinks
  var HOLD_BRAND      = 2.0;   // Stage 2: hold on brand name
  var SWAP_DURATION   = 1.0;   // Stage 3: text slides through mask
  var HOLD_TAGLINE    = 1.0;   // Stage 3b: hold on tagline
  var TAGLINE_FADE    = 0.3;   // Stage 4a: tagline disappears
  var COLLAPSE_SPEED  = 0.9;   // Stage 4b: circle collapses
  var EXIT_DURATION   = 0.8;   // Link click exit animation

  var EXCLUDED_CLASS  = 'no-transition';
  var INITIAL_SCALE   = window.innerWidth < 480 ? 1.4 : 2; // Reduced scale for mobile

  // ── Wait for GSAP ───────────────────────────────────────────
  function waitForGsap(callback) {
    if (typeof gsap !== 'undefined') { callback(); return; }
    var checks = 0;
    var interval = setInterval(function () {
      checks++;
      if (typeof gsap !== 'undefined') {
        clearInterval(interval);
        callback();
      }
      if (checks > 100) {
        clearInterval(interval);
        var el = document.getElementById('page-transition');
        if (el) el.style.display = 'none';
        document.body.classList.remove('no-scroll-transition');
      }
    }, 50);
  }

  // ── STAGE 1-4: Intro Animation ──────────────────────────────
  function playIntro() {
    var overlay  = document.getElementById('page-transition');
    if (!overlay) return;

    var bg       = overlay.querySelector('.page-transition__bg');
    var mask     = overlay.querySelector('.page-transition__text-mask');
    var brand    = overlay.querySelector('.page-transition__text--brand');
    var tagline  = overlay.querySelector('.page-transition__text--tagline');

    if (!bg || !brand || !tagline || !mask) return;

    // Lock scroll
    document.body.classList.add('no-scroll-transition');

    // ── Set mask height to the taller text ────────────────────
    var brandH   = brand.offsetHeight;
    var taglineH = tagline.offsetHeight;
    var maskH    = Math.max(brandH, taglineH);
    gsap.set(mask, { height: maskH });

    // ── Initial State ─────────────────────────────────────────
    // Brand: centered, scaled huge, visible
    gsap.set(brand, {
      scale: INITIAL_SCALE,
      xPercent: 0,
      yPercent: -50,
      top: '50%',
      opacity: 1,
      position: 'absolute',
    });
    // Tagline: off-screen to the right, hidden until needed
    gsap.set(tagline, {
      xPercent: 120,
      yPercent: -50,
      opacity: 1,
      visibility: 'hidden',
      top: '50%',
    });
    // Background: full circle
    gsap.set(bg, { clipPath: 'circle(150% at 50% 50%)' });

    // ── Build Timeline ────────────────────────────────────────
    var tl = gsap.timeline({
      onComplete: function () {
        document.body.classList.remove('no-scroll-transition');
        overlay.style.pointerEvents = 'none';
        gsap.set(overlay, { display: 'none' });
      }
    });

    // STAGE 2: Shrink — giant text scales down to normal
    tl.to(brand, {
      scale: 1,
      duration: SCALE_DOWN,
      ease: 'power2.out',
    });

    // STAGE 2b: Hold — pause on the brand name
    tl.to({}, { duration: HOLD_BRAND });

    // Switch mask to hidden before swap — enables the "invisible edge" clip
    tl.set(mask, { overflow: 'hidden' });

    // Make tagline visible right before it enters
    tl.set(tagline, { visibility: 'visible' });

    // STAGE 3: Invisible Edge Swap
    // Brand slides LEFT out through the mask edge
    tl.to(brand, {
      xPercent: -120,
      duration: SWAP_DURATION,
      ease: 'power2.inOut',
    });
    // Tagline slides in from RIGHT to center — simultaneous
    tl.to(tagline, {
      xPercent: 0,
      duration: SWAP_DURATION,
      ease: 'power2.inOut',
    }, '<'); // '<' = same start time as previous

    // STAGE 3b: Hold on tagline
    tl.to({}, { duration: HOLD_TAGLINE });

    // STAGE 4a: Tagline vanishes
    tl.to(tagline, {
      opacity: 0,
      duration: TAGLINE_FADE,
      ease: 'power1.in',
    });

    // Hide mask during collapse
    tl.to(mask, {
      opacity: 0,
      duration: 0.1,
    });

    // STAGE 4b: Circle Collapse — beige circle shrinks to nothing
    tl.to(bg, {
      clipPath: 'circle(0% at 50% 50%)',
      duration: COLLAPSE_SPEED,
      ease: 'power3.inOut',
    });
  }

  // ── EXIT: Link click animation (circle expand) ──────────────
  function playExit(targetURL) {
    var overlay = document.getElementById('page-transition');
    if (!overlay) { window.location = targetURL; return; }

    var bg      = overlay.querySelector('.page-transition__bg');
    var mask    = overlay.querySelector('.page-transition__text-mask');
    var brand   = overlay.querySelector('.page-transition__text--brand');
    var tagline = overlay.querySelector('.page-transition__text--tagline');

    document.body.classList.add('no-scroll-transition');

    // Reset overlay
    gsap.set(overlay, { display: 'block', pointerEvents: 'all' });
    gsap.set(mask, { opacity: 1 });
    gsap.set(brand, { 
      xPercent: 0, 
      yPercent: -50,
      top: '50%',
      scale: 1, 
      opacity: 1, 
      position: 'absolute' 
    });
    gsap.set(tagline, { opacity: 0, visibility: 'hidden' });

    // Background starts as collapsed circle
    gsap.set(bg, { clipPath: 'circle(0% at 50% 50%)' });

    var tl = gsap.timeline({
      onComplete: function () {
        window.location = targetURL;
      }
    });

    // Expand circle from center outward
    tl.to(bg, {
      clipPath: 'circle(150% at 50% 50%)',
      duration: EXIT_DURATION,
      ease: 'power3.inOut',
    });

    // Brand text fades in
    tl.fromTo(brand, {
      opacity: 0,
      scale: 0.8,
    }, {
      opacity: 1,
      scale: 1,
      duration: EXIT_DURATION * 0.5,
      ease: 'power2.out',
    }, '-=0.3');
  }

  // ── Bind link clicks ────────────────────────────────────────
  function bindLinks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      if (link.hostname !== window.location.hostname) return;
      if ((link.getAttribute('href') || '').indexOf('#') === 0) return;
      if (link.classList.contains(EXCLUDED_CLASS)) return;
      if (link.getAttribute('target') === '_blank') return;

      e.preventDefault();
      playExit(link.getAttribute('href'));
    });
  }

  // ── Handle back/forward ─────────────────────────────────────
  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };

  // ── Initialize ──────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      waitForGsap(function () { playIntro(); bindLinks(); });
    });
  } else {
    waitForGsap(function () { playIntro(); bindLinks(); });
  }
})();
