/* ============================================================
   EVENTS LIBRARY — Interaction & Animations
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Register GSAP Plugins
    gsap.registerPlugin(ScrollTrigger);

    initFilters();
    initParabolicFan();
    initScrollRevels();
});

/**
 * Filter Logic: Categories for the event grid
 */
function initFilters() {
    const filters = document.querySelectorAll('.filter-pill');
    const cards = document.querySelectorAll('.event-card-standard');

    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            // Remove active class from all pills
            filters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');

            const category = filter.getAttribute('data-filter');

            // Animate card filtering
            gsap.to(cards, {
                opacity: 0,
                scale: 0.95,
                duration: 0.3,
                stagger: 0.05,
                onComplete: () => {
                    cards.forEach(card => {
                        const cardType = card.getAttribute('data-type');
                        if (category === 'all' || cardType === category) {
                            card.style.display = 'flex';
                        } else {
                            card.style.display = 'none';
                        }
                    });

                    // Reveal filtered results
                    gsap.to('.event-card-standard:visible', {
                        opacity: 1,
                        scale: 1,
                        duration: 0.4,
                        stagger: 0.05,
                        clearProps: 'all'
                    });
                    
                    // Trigger scroll refresh in case layout shifted significantly
                    ScrollTrigger.refresh();
                }
            });
        });
    });
}

/**
 * Parabolic Fan Animation:
 * Fan out cards in an arc when the section comes into view
 */
function initParabolicFan() {
    const cards = document.querySelectorAll('.parabolic-card');
    if (!cards.length) return;

    // Set initial state (stacked in center)
    gsap.set(cards, {
        x: 0,
        y: 100,
        rotation: 0,
        opacity: 0,
        scale: 0.8
    });

    // Animate fan-out on scroll
    gsap.to(cards, {
        scrollTrigger: {
            trigger: '.parabolic-cards-wrap',
            start: 'top 80%',
            end: 'center 40%',
            scrub: 1, // Smoothly link to scroll
        },
        x: (i, el) => el.getAttribute('data-x'),
        y: (i, el) => el.getAttribute('data-y'),
        rotation: (i, el) => el.getAttribute('data-rotate'),
        opacity: 1,
        scale: 1,
        stagger: 0.02,
        duration: 1.5,
        ease: 'power3.out'
    });
}

/**
 * Scroll Reveals:
 * Fade and slide in content as user scrolls
 */
function initScrollRevels() {
    const revealItems = document.querySelectorAll('.animate-on-scroll');
    
    revealItems.forEach(item => {
        gsap.from(item, {
            scrollTrigger: {
                trigger: item,
                start: 'top 90%',
                toggleActions: 'play none none none'
            },
            y: 40,
            opacity: 0,
            duration: 1,
            ease: 'expo.out'
        });
    });

    // Stagger the grid cards initial reveal
    gsap.from('.event-card-standard', {
        scrollTrigger: {
            trigger: '.events-grid',
            start: 'top 85%'
        },
        y: 60,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power4.out',
        clearProps: 'all'
    });
}

/**
 * Fallback for missing/broken images
 */
function handleImageLoadError(img) {
    img.src = 'https://irp.cdn-website.com/23c7a45a/dms3rep/multi/opt/placeholder-events.jpg';
    img.onerror = null; // Prevent infinite loops
}
