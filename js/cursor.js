/**
 * Custom Cursor & Global Cursor Movement Module
 * Features:
 * - Hardware-accelerated translate3d tracking
 * - High-performance throttled open planet boundary checking
 * - Clean document edge exit handling
 */

export function initCustomCursor(planetManager) {
  const customCursor = document.getElementById('customCursor');
  if (!customCursor) return;

  window.lastGlobalMouseX = window.innerWidth / 2;
  window.lastGlobalMouseY = window.innerHeight / 2;

  window.addEventListener('mousemove', e => {
    window.lastGlobalMouseX = e.clientX;
    window.lastGlobalMouseY = e.clientY;

    customCursor.style.transform = `translate3d(${e.clientX - 6}px, ${e.clientY - 4}px, 0)`;
    customCursor.classList.add('on');

    // High performance guard: only calculate distance if at least one planet is currently open
    if (planetManager && planetManager.activeOpenPlanets && planetManager.activeOpenPlanets.size > 0) {
      planetManager.activeOpenPlanets.forEach(p => {
        const dist = planetManager.getMinDistanceToPlanetCluster(e.clientX, e.clientY, p);
        if (dist > 50) {
          planetManager.closePlanet(p, false);
        }
      });
    }
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (e.touches && e.touches.length > 0) {
      window.lastGlobalMouseX = e.touches[0].clientX;
      window.lastGlobalMouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    customCursor.classList.remove('on');

    if (planetManager && planetManager.activeOpenPlanets) {
      planetManager.activeOpenPlanets.forEach(p => {
        planetManager.closePlanet(p, false);
      });
    }

    document.querySelectorAll('.planet').forEach(p => {
      p.classList.remove('peeking');
      const img = p.querySelector('.orb canvas') || p.querySelector('.orb img');
      if (img && typeof gsap !== 'undefined') {
        gsap.to(img, { scale: 1.0, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
      }
    });
  });
}
