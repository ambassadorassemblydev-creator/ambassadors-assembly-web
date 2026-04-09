/* ============================================================
   SERMONS PAGE JS
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {

  // 1. Hero Staggered Reveal
  const heroContent = document.querySelector('.sermons-hero__content');
  const heroCard = document.querySelector('.sermons-hero__card');

  if (heroContent) {
    gsap.from(heroContent.children, {
      y: 50,
      opacity: 0,
      stagger: 0.12,
      duration: 1,
      ease: 'power3.out',
      delay: 0.6
    });
  }

  if (heroCard) {
    gsap.from(heroCard, {
      y: 40,
      opacity: 0,
      scale: 0.95,
      duration: 1.2,
      ease: 'power3.out',
      delay: 0.8
    });
  }

  // 2. Section reveals on scroll
  const sections = document.querySelectorAll('.page-section');
  sections.forEach(section => {
    gsap.from(section, {
      y: 40,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 85%',
        once: true
      }
    });
  });

  // 3. Staggered Library Cards
  const cards = document.querySelectorAll('.sermon-card-lib');
  if (cards.length) {
    gsap.from(cards, {
      y: 50,
      opacity: 0,
      duration: 0.7,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.sermons-grid',
        start: 'top 85%',
        once: true
      }
    });
  }

  // 4. Client-side Categorization Filtering
  const filterBtns = document.querySelectorAll('.filter-pill');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Manage active states
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      // GSAP fade-out then filter then fade-in
      gsap.to(cards, {
        opacity: 0,
        y: 20,
        duration: 0.25,
        ease: 'power2.in',
        stagger: 0.02,
        onComplete: () => {
          cards.forEach(card => {
            const tags = (card.getAttribute('data-tags') || '').toLowerCase();
            if (filter === 'all' || tags.includes(filter.toLowerCase())) {
              card.style.display = 'flex';
            } else {
              card.style.display = 'none';
            }
          });

          ScrollTrigger.refresh();

          // Animate visible cards back in
          const visible = [...cards].filter(c => c.style.display !== 'none');
          gsap.to(visible, {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: 'power2.out',
            stagger: 0.04
          });
        }
      });
    });
  });

});
