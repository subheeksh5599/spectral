(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reference ribbon, hero curtain, and metric-stack choreography.

    // 1. Medium-tempo deliberate ribbon scroll with smooth lerp
    const path = document.getElementById('journey-path');
    let pathLength = 0;
    let targetProgress = 0;
    let currentProgress = 0;

    if (path) {
      pathLength = path.getTotalLength();
      path.style.strokeDasharray = pathLength;
      path.style.strokeDashoffset = pathLength;
    }

    const journeySection = document.getElementById('methodology-journey');

    function updateScrollCalculations() {
      if (!journeySection || !path) return;
      const rect = journeySection.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Generous buffer so the green line advances at a steady, medium-tempo pace
      const totalScrollableDistance = rect.height + windowHeight * 0.4;
      const currentPassed = windowHeight - rect.top;
      
      const rawPercent = currentPassed / totalScrollableDistance;
      targetProgress = Math.min(Math.max(rawPercent, 0), 1);
    }

    // Smooth RAF loop for lerping line progress to achieve gentle, graceful motion
    function animationLoop() {
      currentProgress += (targetProgress - currentProgress) * 0.08;
      if (path && pathLength > 0) {
        path.style.strokeDashoffset = pathLength - (pathLength * currentProgress);
      }
      requestAnimationFrame(animationLoop);
    }
    requestAnimationFrame(animationLoop);

    window.addEventListener('scroll', updateScrollCalculations, { passive: true });
    updateScrollCalculations();

    // 2. Smooth parallax curtain on hero
    const hero = document.getElementById('hero-curtain');
    window.addEventListener('scroll', () => {
      if (!hero) return;
      const scrollPos = window.scrollY;
      if (scrollPos < 900) {
        const opacityVal = 1 - (scrollPos / 1100);
        hero.style.opacity = Math.max(opacityVal, 0).toFixed(2);
      }
    }, { passive: true });

    // 3. Stacking Card Deck Elevation & Subtle Scale Effect
    const card1 = document.getElementById('metric-card-1');
    const card2 = document.getElementById('metric-card-2');
    const card3 = document.getElementById('metric-card-3');
    
    window.addEventListener('scroll', () => {
      if (!card1 || !card2 || !card3) return;
      
      const r2 = card2.getBoundingClientRect();
      const r3 = card3.getBoundingClientRect();
      
      // When card 2 reaches its sticky position (top ~ 140px), slightly tuck Card 1
      if (r2.top <= 200) {
        const factor = Math.min(Math.max((200 - r2.top) / 150, 0), 1);
        card1.style.transform = `scale(${1 - factor * 0.04}) translateY(-${factor * 8}px)`;
        card1.style.opacity = (1 - factor * 0.15).toFixed(2);
      } else {
        card1.style.transform = 'scale(1) translateY(0px)';
        card1.style.opacity = '1';
      }

      // When card 3 reaches its sticky position (top ~ 180px), slightly tuck Card 2
      if (r3.top <= 240) {
        const factor2 = Math.min(Math.max((240 - r3.top) / 150, 0), 1);
        card2.style.transform = `scale(${1 - factor2 * 0.03}) translateY(-${factor2 * 6}px)`;
      } else {
        card2.style.transform = 'scale(1) translateY(0px)';
      }
    }, { passive: true });
  

  // Added card/illustration reveal layer. The reference export had the geometry;
  // this supplies the missing entry choreography without changing the layout.
  const revealItems = document.querySelectorAll('.reveal-card, [data-reveal], .reveal-figure');
  const heroIllustration = document.querySelector('[data-reveal="illustrated-community"]');
  const firstCard = document.querySelector('.reveal-card');
  if (heroIllustration) window.setTimeout(() => heroIllustration.classList.add('is-revealed'), 80);
  if (firstCard) window.setTimeout(() => firstCard.classList.add('is-revealed'), 360);
  if (prefersReducedMotion) {
    revealItems.forEach((item) => item.classList.add('is-revealed'));
  } else {
    revealItems.forEach((item, index) => {
      item.style.setProperty('--reveal-delay', `${Math.min(index * 55, 330)}ms`);
    });
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.14 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // Give each illustrated block a quiet independent rhythm. The SVG artwork stays
  // untouched; only its containing composition receives the motion.
  document.querySelectorAll('.char-float, .char-float-delay').forEach((item, index) => {
    item.style.setProperty('--character-phase', `${index * -0.65}s`);
  });
})();
