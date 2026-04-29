/* ============================================================
   INDEX PAGE SCRIPTS
   Extracted from inline <script> blocks in index.ejs
   For: Ambassadors Assembly — Homepage
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // ─── Lenis Smooth Scroll + GSAP Integration ─────────────────
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    touchMultiplier: 2,
  });

  // Connect Lenis scroll position to GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // ─── Ministry Card GSAP Scroll Animations (Desktop) ─────────
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // ── Ministry image scatter → grid animation (desktop only) ──
  const mm = gsap.matchMedia();
  mm.add("(min-width: 1024px)", () => {
    const img1 = document.getElementById("img-1");
    const img2 = document.getElementById("img-2");
    const img3 = document.getElementById("img-3");
    const img4 = document.getElementById("img-4");
    const img5 = document.getElementById("img-5");

    if (!img1 || !img3) return; // guard if elements don't exist

    const rect1 = img1.getBoundingClientRect();
    const rect2 = img3.getBoundingClientRect();

    gsap.set(img1, { y: -1200, x: -rect1.width - 50, rotate: -7, scale: 0.55 });
    gsap.set(img2, { y: -1350, x: rect1.width + 50, rotate: 9, scale: 0.6 });
    gsap.set(img3, { y: -1400, x: -rect2.width - 30, rotate: -2, scale: 0.7 });
    gsap.set(img4, { y: -1350, x: rect2.width + 50, rotate: 3, scale: 0.65 });
    gsap.set(img5, { y: -1420, x: rect2.width + 50, rotate: -2, scale: 0.75 });

    const ministryTl = gsap.timeline();
    ministryTl.to([img1, img2, img3, img4, img5], {
      scrollTrigger: {
        trigger: ".ministries-trigger",
        start: "top+=30% top",
        scrub: true,
        endTrigger: ".ministries",
        end: "bottom-=60% bottom-=200px",
      },
      y: 0,
      scale: 1,
      rotate: 0,
    });
    ministryTl.to([img1, img2, img3, img4, img5], {
      scrollTrigger: {
        trigger: ".ministries-trigger",
        start: "top+=75% top",
        scrub: true,
        endTrigger: ".ministries",
        end: "bottom-=50% bottom-=200px",
      },
      x: 0,
    });
  });

  // ── Mobile Ministry Swiper ──────────────────────────────────
  const minSwiperEl = document.querySelector('.min-swiper');
  if (minSwiperEl) {
    new Swiper('.min-swiper', {
      loop: false,
      slidesPerView: 1,
      spaceBetween: 20,
      navigation: {
        nextEl: ".min-nav-next",
        prevEl: ".min-nav-prev",
      },
    });
  }

  // ── Hero Section Swiper ─────────────────────────────────────
  const heroSwiperEl = document.querySelector('.heroSwiper');
  if (heroSwiperEl) {
    const heroWrap = document.querySelector('.hero-swiper-wrap');
    const startSlide = (heroWrap && heroWrap.getAttribute('data-start-with-slide3') === 'true') ? 2 : 0;

    const heroSwiper = new Swiper('.heroSwiper', {
      loop: true,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: 1000,
      initialSlide: startSlide,
      autoplay: {
        delay: 6000,
        disableOnInteraction: false,
      },
      pagination: {
        el: '.hero-pag',
        clickable: true,
      },
      navigation: {
        nextEl: '.hero-next',
        prevEl: '.hero-prev',
      },
      on: {
        init: function () {
          heroWrap.style.visibility = 'visible';
          animateSlide(this.slides[this.activeIndex]);
        },
        slideChangeTransitionStart: function () {
          animateSlide(this.slides[this.activeIndex]);
        }
      }
    });

    function animateSlide(slide) {
      if (!slide) return;
      const title = slide.querySelector('.gsap-slide-title');
      const text = slide.querySelector('.gsap-slide-text');
      const btns = slide.querySelector('.gsap-slide-btns');

      gsap.fromTo([title, text, btns], {
        y: 30,
        opacity: 0
      }, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        overwrite: true
      });
    }
  }

  // ── Mobile-specific Scripts ─────────────────────────────────
  if (window.innerWidth < 767) {

    const mobileLines = document.querySelector(".mobile-lines");
    if (mobileLines) {
      mobileLines.classList.add("animate-lines");
    }

    const mobileMenu = document.querySelector(".mobile-menu");
    if (mobileMenu) {
      const scrollPoint = 145;
      const mobileMenuTl = gsap.timeline({ paused: true })
        .to(mobileMenu, {
          y: -50,
          scale: 0.8,
          opacity: 0,
          ease: "sine.out",
          onComplete: function () { 
            if (mobileMenu) mobileMenu.style.display = "none";
          },
        });

      let isHidden = false;
      window.addEventListener("scroll", () => {
        const scrollTop = window.scrollY;
        if (scrollTop >= scrollPoint && !isHidden) {
          isHidden = true;
          mobileMenuTl.restart();
        }
        if (scrollTop < scrollPoint && isHidden) {
          isHidden = false;
          if (!document.querySelector(".layout-drawer_open")) {
            gsap.set(mobileMenu, {
              y: 0,
              opacity: 0,
              display: 'block',
              scale: 1
            });
            gsap.to(mobileMenu, {
              opacity: 1,
              duration: 0.4,
              ease: "sine.out"
            });
          } else {
            mobileMenuTl.pause(100);
          }
        }
      });
    }
  }

  // ── Shared Animation Utilities ──────────────────────────────

  function getDelay(el) {
    const delayClass = Array.from(el.classList).find(cls => cls.startsWith("delay-"));
    if (!delayClass) return 0;
    const delayString = delayClass.replace("delay-", "").replace("x", ".");
    return parseFloat(delayString) || 0;
  }

  // ── Color-fill text animation ───────────────────────────────
  document.fonts.ready.then(() => {
    const colorFill = document.querySelectorAll(".color-fill-trigger");
    if (colorFill) {
      colorFill.forEach((el) => {
        const fill = el.querySelector(".animate-color-fill");
        const split = SplitText.create(fill, { type: "words, chars" });
        const tl = gsap
          .timeline({
            scrollTrigger: {
              trigger: el,
              start: "top bottom-=25%",
              end: "bottom 20%",
              scrub: 0.5,
            },
          })
          .set(
            split.chars,
            {
              duration: 0.5,
              color: "#000",
              stagger: 0.2,
            },
            0.1
          );
      });
    }
  });

  // ── Animate-up elements ─────────────────────────────────────
  const animateUp = document.querySelectorAll(".animate-up");
  if (animateUp) {
    animateUp.forEach((el) => {
      const delay = getDelay(el);
      gsap.fromTo(el, {
        opacity: 0,
        y: 25,
        ease: 'sine',
      }, {
        y: 0,
        opacity: 1,
        duration: .7,
        delay: delay,
        scrollTrigger: {
          trigger: el,
        }
      });
    });
  }

  // ── Animate-lines (split text) ──────────────────────────────
  const lines = document.querySelectorAll(".animate-lines");
  document.fonts.ready.then(() => {
    if (lines) {
      lines.forEach((el) => {
        const delay = getDelay(el);
        const line = el.querySelector("span");
        const split = SplitText.create(line, { type: "lines" });
        gsap.from(split.lines, {
          y: 25,
          autoAlpha: 0,
          stagger: .1,
          duration: .8,
          scrollTrigger: {
            trigger: el,
          },
          delay: delay,
          onComplete: () => split.revert(),
        });
      });
    }
  });

  // ── Card batch animations ───────────────────────────────────
  if (document.querySelector(".animate-card-3")) {
    gsap.set(".animate-card-3", { y: 25, opacity: 0 });
    ScrollTrigger.batch(".animate-card-3", {
      interval: 0.1,
      batchMax: 3,
      duration: 3,
      onEnter: batch => gsap.to(batch, {
        opacity: 1,
        y: 0,
        ease: 'sine',
        stagger: { each: 0.15, grid: [1, 3] },
        overwrite: true
      }),
      onLeave: batch => gsap.set(batch, { opacity: 1, y: 0, overwrite: true }),
    });
  }

  if (document.querySelector(".animate-card-2")) {
    gsap.set(".animate-card-2", { y: 25, opacity: 0 });
    ScrollTrigger.batch(".animate-card-2", {
      interval: 0.1,
      batchMax: 2,
      duration: 6,
      onEnter: batch => gsap.to(batch, {
        opacity: 1,
        y: 0,
        ease: 'sine',
        stagger: { each: 0.15, grid: [1, 2] },
        overwrite: true
      }),
      onLeave: batch => gsap.set(batch, { opacity: 1, y: 0, overwrite: true }),
    });
  }

  // ── Pin elements ────────────────────────────────────────────
  const pins = document.querySelectorAll(".pin");
  if (pins) {
    pins.forEach((pin) => {
      const pinTl = gsap.timeline({
        scrollTrigger: {
          trigger: pin.parentNode,
          start: 'top top+=120',
          end: 'bottom top+=30%',
          pin: pin,
          scrub: true,
        }
      });
    });
  }

  // ── Footer slide-up animation ───────────────────────────────
  const footer = document.querySelector(".footer-bg");
  if (footer) {
    gsap.set(footer, { y: 300, opacity: 0 });
    gsap.to(footer, {
      scrollTrigger: {
        trigger: footer,
      },
      y: 0,
      opacity: 1,
      delay: .3,
      duration: 1,
      ease: 'sine',
    });
  }

  // ── Hide sticky bar when footer is visible ─────────────────
  const stickyBar = document.getElementById('sticky-bar');
  const footerEl = document.querySelector('.dmFooterContainer');
  if (stickyBar && footerEl) {
    const footerObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          stickyBar.style.transform = 'translateY(120%)';
        } else {
          stickyBar.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });
    footerObserver.observe(footerEl);
  }

  // ── Hamburger menu item animations ──────────────────────────
  const hamItems = document.querySelectorAll(".ham-item");
  hamItems.forEach((el, i) => {
    const hamButton = document.querySelectorAll(".hamburgerButton");
    const closeButton = document.querySelector(".hamburger-drawer .hamburgerButton");
    const menu = document.getElementById("hamburger-drawer");
    const text = el.querySelector(".ham-title");
    const desc = el.querySelector(".ham-desc");
    const hamTl = gsap.timeline({ paused: true });

    hamTl.from(text, {
      autoAlpha: 0,
      x: 35,
      duration: .7,
      delay: i * .05,
      ease: 'sine',
    }, '<');

    hamTl.from(desc, {
      autoAlpha: 0,
      duration: .7,
      delay: i * .05,
      ease: 'sine'
    }, '-=.25');

    hamButton.forEach((button) => {
      button.addEventListener("click", () => {
        hamTl.play();
      });
    });

    if (closeButton) {
      closeButton.addEventListener("click", () => {
        hamTl.restart();
        hamTl.pause();
      });
    }
  });

  // ── Sidebar link animations ─────────────────────────────────
  const sideBarLinks = document.querySelectorAll('.scrollspy');
  if (sideBarLinks.length) {
    const sidebarTl = gsap.timeline();
    sidebarTl.from('.scrollspy ul li', {
      x: 25,
      autoAlpha: 0,
      ease: 'sine',
      stagger: 0.1,
      scrollTrigger: '.scrollspy',
    });
  }

  // ── Refresh ScrollTrigger on resize ─────────────────────────
  window.addEventListener('resize', function (event) {
    ScrollTrigger.refresh();
  });

  // ============================================================
  // EVENT CARDS — Fan out animation
  // ============================================================
  const eventCards = document.querySelectorAll(".event-card");
  if (eventCards.length > 0) {
    eventCards.forEach((card) => {
      const startPos = card.dataset.start || "0";
      const x = card.dataset.x || "0";
      const y = card.dataset.y || "0";
      const rotate = card.dataset.rotate || "0";
      
      const eventsComplete = () => {
        gsap.set(card, {
          y: y,
          x: x,
          rotate: rotate,
        });
      };
      
      const eventsTl = gsap.timeline({ 
        scrollTrigger: {
          trigger: '.event-cards',
          start: "top 80%"
        }, 
        onComplete: eventsComplete 
      });
      
      gsap.set(card, {
        y: 100,
        x: startPos,
        rotate: -12,
      });
      
      eventsTl.to(card, {
        rotate: 0,
        y: 0,
        ease: "sine",
        duration: 0.75,
      });
      
      eventsTl.to(card, {
        opacity: 1,
        duration: 0.5,
      });
      
      eventsTl.to(card, {
        x: x,
        y: y,
        rotate: rotate,
        ease: "sine",
      }, ">=-0.5");
      
      if (window.innerWidth > 767) {
        card.addEventListener("mouseenter", () => {
          gsap.to(card, {
            y: parseFloat(y) - 25,
            rotate: 0,
            duration: 0.3,
            ease: "sine",
          });
        });
        card.addEventListener("mouseleave", () => {
          gsap.to(card, {
            y: y,
            rotate: rotate,
            duration: 0.3,
            ease: "sine",
          });
        });
      }
    });
  }

  // ============================================================
  // LOVE IN ACTION — Scroll-Scrubbed Parallax + Circle Collapse
  // Section is 100vh, pinned with extra scroll distance for parallax
  // ============================================================
  const loveSection = document.getElementById('love-section');
  if (loveSection) {
    const loveCenter  = document.getElementById('love-center');
    const loveCircle  = document.getElementById('love-circle');
    const giantLove   = document.querySelector('.love-giant--love');
    const giantIn     = document.querySelector('.love-giant--in');
    const giantAction = document.querySelector('.love-giant--action');
    const giantShadow = document.querySelector('.love-giant--action-shadow');

    // 1. Pin the entire section for extended scroll distance
    ScrollTrigger.create({
      trigger: loveSection,
      start: 'top top',
      end: '+=200%',   // 2x viewport of scroll room while pinned
      pin: true,
      pinSpacing: true,
    });

    // 2. Parallax — giant words move UP at different speeds (all scrubbed to the pin)
    gsap.to(giantLove, {
      yPercent: -60,
      ease: 'none',
      scrollTrigger: {
        trigger: loveSection,
        start: 'top top',
        end: '+=200%',
        scrub: true,
      }
    });

    gsap.to(giantIn, {
      yPercent: -100,
      ease: 'none',
      scrollTrigger: {
        trigger: loveSection,
        start: 'top top',
        end: '+=200%',
        scrub: true,
      }
    });

    gsap.to(giantAction, {
      yPercent: -160,
      ease: 'none',
      scrollTrigger: {
        trigger: loveSection,
        start: 'top top',
        end: '+=200%',
        scrub: true,
      }
    });

    // Shadow moves slightly slower = 3D depth illusion
    gsap.to(giantShadow, {
      yPercent: -130,
      ease: 'none',
      scrollTrigger: {
        trigger: loveSection,
        start: 'top top',
        end: '+=200%',
        scrub: true,
      }
    });

    // 3. Circle Collapse — starts massive, shrinks to frame the text
    gsap.fromTo(loveCircle, {
      scale: 1,
      opacity: 0,
    }, {
      scale: 0.06,
      opacity: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: loveSection,
        start: 'top top',         // circle starts immediately on entry
        end: '+=200%',
        scrub: true,
      }
    });
  }

  // ============================================================
  // RECENT SERMONS AND EVENTS — Scroll nav + reveal animation
  // ============================================================
  const scrollAmt = 310;

  const sermonsRow = document.getElementById('sermons-row');
  const sermonsPrev = document.getElementById('sermons-prev');
  const sermonsNext = document.getElementById('sermons-next');

  if (sermonsRow) {
    if (sermonsPrev) {
      sermonsPrev.addEventListener('click', function () {
        sermonsRow.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
      });
    }
    if (sermonsNext) {
      sermonsNext.addEventListener('click', function () {
        sermonsRow.scrollBy({ left: scrollAmt, behavior: 'smooth' });
      });
    }

    // Staggered reveal
    gsap.from('.sermon-card', {
      y: 60,
      opacity: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#sermons-section',
        start: 'top 80%',
        once: true,
      }
    });
  }

  const eventsRow = document.getElementById('events-row');
  const eventsPrev = document.getElementById('events-prev');
  const eventsNext = document.getElementById('events-next');

  if (eventsRow) {
    if (eventsPrev) {
      eventsPrev.addEventListener('click', function () {
        eventsRow.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
      });
    }
    if (eventsNext) {
      eventsNext.addEventListener('click', function () {
        eventsRow.scrollBy({ left: scrollAmt, behavior: 'smooth' });
      });
    }
  }

  // ============================================================
  // EVENTS — Staggered reveal
  // ============================================================
  if (document.getElementById('events-section')) {
    gsap.from('.event-card-new', {
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#events-section',
        start: 'top 80%',
        once: true,
      }
    });
  }

  // ============================================================
  // ABOUT — Slide in from sides
  // ============================================================
  if (document.getElementById('about-section')) {
    gsap.from('.about-card', {
      x: -80,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#about-section',
        start: 'top 75%',
        once: true,
      }
    });

    gsap.from('.about-content', {
      x: 80,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#about-section',
        start: 'top 75%',
        once: true,
      }
    });
  }

  // ============================================================
  // NEWSLETTER — Fade up
  // ============================================================
  if (document.getElementById('newsletter-section')) {
    gsap.from('.newsletter-inner', {
      y: 40,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#newsletter-section',
        start: 'top 85%',
        once: true,
      }
    });
  }

  // ============================================================
  // AI CHAT — Tooltip toggle
  // ============================================================
  const chatFab = document.getElementById('chat-fab');
  const chatTooltip = document.getElementById('chat-tooltip');

  if (chatFab && chatTooltip) {
    chatFab.addEventListener('click', function () {
      chatTooltip.classList.toggle('is-visible');
    });

    // Close tooltip when clicking outside
    document.addEventListener('click', function (e) {
      if (!chatFab.contains(e.target) && !chatTooltip.contains(e.target)) {
        chatTooltip.classList.remove('is-visible');
      }
    });
  }

  // ============================================================
  // FULLSCREEN MENU — Morphing Takeover Animation
  // ============================================================
  const fsMenu = document.getElementById('fs-menu');
  const fsMenuBg = fsMenu ? fsMenu.querySelector('.fs-menu__bg') : null;
  const fsMenuClose = document.getElementById('fs-menu-close');
  const fsMenuLinks = fsMenu ? fsMenu.querySelectorAll('.fs-menu__link') : [];
  const fsMenuDetails = document.getElementById('fs-menu-details');
  const hamburgerBtns = document.querySelectorAll('.hamburgerButton');

  let menuOpen = false;
  let menuTl = null;

  function getMenuOrigin(btn) {
    if (!btn) return 'calc(100% - 80px) 30px';
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return x + 'px ' + y + 'px';
  }

  function openMenu(originBtn) {
    if (menuOpen || !fsMenu || !fsMenuBg) return;
    menuOpen = true;
    fsMenu.classList.add('is-open');

    // Set clip-path origin from the button that was clicked
    var origin = getMenuOrigin(originBtn);

    // Kill any running timeline
    if (menuTl) menuTl.kill();
    menuTl = gsap.timeline();

    // Phase 1: Circle expansion (Slightly faster for impact)
    menuTl.fromTo(fsMenuBg,
      { clipPath: 'circle(0% at ' + origin + ')' },
      { clipPath: 'circle(150% at ' + origin + ')', duration: 0.6, ease: 'power3.inOut' }
    );

    // Phase 2: Staggered text cascade (Delayed to allow background to cover screen)
    menuTl.fromTo(fsMenuLinks,
      { y: '110%' },
      { y: '0%', duration: 0.6, stagger: 0.08, ease: 'power3.out' },
      '-=0.05' // Synchronized with end of circle growth
    );

    // Phase 2b: Right column details fade + slide
    if (fsMenuDetails) {
      menuTl.fromTo(fsMenuDetails,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
        '-=0.4'
      );
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (!menuOpen || !fsMenu || !fsMenuBg) return;

    if (menuTl) menuTl.kill();
    menuTl = gsap.timeline({
      onComplete: function () {
        menuOpen = false;
        fsMenu.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    });

    // Phase 3a: Text retreat — links slide down behind masks
    menuTl.to(fsMenuLinks, {
      y: '110%',
      duration: 0.35,
      stagger: 0.03,
      ease: 'power3.in'
    });

    // Phase 3a: Details fade out
    if (fsMenuDetails) {
      menuTl.to(fsMenuDetails, {
        opacity: 0,
        y: 20,
        duration: 0.3,
        ease: 'power3.in'
      }, '<');
    }

    // Phase 3b: Circle collapse back to origin
    menuTl.to(fsMenuBg, {
      clipPath: 'circle(0% at calc(100% - 80px) 30px)',
      duration: 0.6,
      ease: 'power3.inOut'
    }, '-=0.1');
  }

  // Wire all hamburger buttons to open the new menu
  hamburgerBtns.forEach(function (btn) {
    // Prevent Duda default drawer
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openMenu(btn);
    }, true);
  });

  // Close button
  if (fsMenuClose) {
    fsMenuClose.addEventListener('click', function (e) {
      e.preventDefault();
      closeMenu();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) {
      closeMenu();
    }
  });
});
