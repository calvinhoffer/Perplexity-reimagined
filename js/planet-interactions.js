/**
 * Planet Interactions & Orbit Tabs Animation Module
 * Features:
 * - Geometric radial fanning layout with viewport boundary protection
 * - GSAP open/close timelines with proper cleanup
 * - Zero-layout-thrashing mouse distance tracking using geometric cluster bounds
 * - Full keyboard accessibility (Enter/Space to open, Esc to close)
 * - Debounced resize listener
 */

import { planetTabsConfig, defaultSizes } from './config.js';

export function initPlanetInteractions(threeInstances) {
  const planetTabsState = {};
  const activeOpenPlanets = new Set();

  // Initialize tabs and radial labels for every planet
  Object.keys(planetTabsConfig).forEach(planetId => {
    const config = planetTabsConfig[planetId];
    const planet = document.getElementById(planetId);
    if (!planet) return;
    const orbit = planet.querySelector('.orbit');
    if (!orbit) return;

    planet.setAttribute('role', 'button');
    planet.setAttribute('aria-expanded', 'false');

    const tabElements = [];
    const labelElements = [];

    config.tabs.forEach((t, i) => {
      const a = document.createElement('a');
      a.className = 'tab-dot';
      a.title = t.n;
      a.dataset.name = t.n;
      a.href = t.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', t.n);

      const im = document.createElement('img');
      im.src = t.img;
      im.alt = t.n;
      im.draggable = false;
      a.appendChild(im);

      const lbl = document.createElement('div');
      lbl.className = 'tab-name';
      lbl.id = `${planetId}-tab-label-${i}`;
      lbl.textContent = t.n;
      lbl.setAttribute('aria-hidden', 'true');

      a.addEventListener('mouseenter', () => {
        if (!planet.classList.contains('open')) return;
        lbl.classList.add('visible');
        if (typeof gsap !== 'undefined') {
          gsap.to(a, { scale: 1.18, opacity: 1, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
        }
        const cursor = document.getElementById('customCursor');
        if (cursor) cursor.classList.add('on');
      });

      a.addEventListener('mouseleave', () => {
        lbl.classList.remove('visible');
        if (typeof gsap !== 'undefined') {
          if (planet.classList.contains('open')) {
            gsap.to(a, { scale: 1, opacity: 0.7, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
          } else {
            gsap.to(a, { scale: 0.45, opacity: 0, duration: 0.15, ease: 'power2.out', overwrite: 'auto' });
          }
        }
      });

      a.addEventListener('focus', () => {
        if (!planet.classList.contains('open')) return;
        lbl.classList.add('visible');
        if (typeof gsap !== 'undefined') {
          gsap.to(a, { scale: 1.18, opacity: 1, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
        }
      });

      a.addEventListener('blur', () => {
        lbl.classList.remove('visible');
        if (planet.classList.contains('open') && typeof gsap !== 'undefined') {
          gsap.to(a, { scale: 1, opacity: 0.7, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
        }
      });

      a.addEventListener('click', e => {
        if (!planet.classList.contains('open')) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.stopPropagation(); // Navigate without toggling planet
      });

      orbit.appendChild(a);
      orbit.appendChild(lbl);
      tabElements.push(a);
      labelElements.push(lbl);
    });

    planetTabsState[planetId] = {
      config,
      orbit,
      tabElements,
      labelElements,
      coords: [],
      clusterRadius: 0
    };
  });

  // Calculate layout geometry for all planet orbits and their tabs
  function layoutTabs() {
    Object.keys(planetTabsState).forEach(planetId => {
      const state = planetTabsState[planetId];
      const planet = document.getElementById(planetId);
      if (!state || !planet) return;
      const s = planet.offsetWidth || defaultSizes[planetId] || 180;
      const { gap, spread, dotSize, tabs } = state.config;
      const R = s / 2 + gap;
      const count = tabs.length;

      state.clusterRadius = R + dotSize / 2 + 10;

      state.coords = tabs.map((t, i) => {
        const a = state.tabElements[i];
        const lbl = state.labelElements[i];

        const centerAngle = (state.config.centerAngle !== undefined) ? state.config.centerAngle : 0;
        const angDeg = count === 1 ? centerAngle : (centerAngle - spread / 2 + i * (spread / (count - 1)));
        const ang = angDeg * Math.PI / 180;
        const cx = s / 2 + R * Math.sin(ang);
        const cy = s / 2 - R * Math.cos(ang);

        const targetLeft = cx - dotSize / 2;
        const targetTop = cy - dotSize / 2;

        const ux = Math.sin(ang);
        const uy = -Math.cos(ang);

        const startLeft = (cx - ux * 24) - dotSize / 2;
        const startTop = (cy - uy * 24) - dotSize / 2;

        // Balanced natural distance (~15px gap on hover)
        const labelGap = Math.round(dotSize * 0.2 + 11);
        const startX = cx + ux * (dotSize / 2 + labelGap);
        const startY = cy + uy * (dotSize / 2 + labelGap);
        const isFlipped = (angDeg < -8);
        let rotDeg = isFlipped ? (angDeg + 90) : (angDeg - 90);

        // Viewport boundary guard: prevent rightmost labels from leaving screen
        if (planet.getBoundingClientRect) {
          const pRect = planet.getBoundingClientRect();
          const screenX = pRect.left + startX;
          const textLength = Math.max(65, (t.n.length || 6) * 10);
          const rad = (rotDeg * Math.PI) / 180;
          const textEndX = screenX + Math.cos(rad) * textLength;
          if (textEndX > window.innerWidth - 18) {
            rotDeg = -68; // Rotate upward into negative space
          }
        }

        if (lbl) {
          lbl.style.left = startX + 'px';
          lbl.style.top = startY + 'px';
          lbl.style.setProperty('--rot', `${rotDeg}deg`);
          if (isFlipped) lbl.classList.add('flipped');
          else lbl.classList.remove('flipped');
        }

        if (a) {
          if (planet.classList.contains('open')) {
            a.style.left = targetLeft + 'px';
            a.style.top = targetTop + 'px';
            a.style.opacity = '0.7';
            a.style.transform = 'scale(1)';
          } else if (typeof gsap !== 'undefined') {
            gsap.set(a, { left: startLeft, top: startTop, scale: 0.45, opacity: 0 });
          } else {
            a.style.left = startLeft + 'px';
            a.style.top = startTop + 'px';
            a.style.opacity = '0';
          }
        }

        return { targetLeft, targetTop, startLeft, startTop, angDeg, rotDeg, cx, cy, ux, uy };
      });
    });
  }

  layoutTabs();

  // Debounced resize listener to avoid layout thrashing during browser resize
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(layoutTabs, 80);
  });

  // Open planet with GSAP animation
  function openPlanet(planet) {
    if (!planet) return;

    // Smoothly close any other open or closing planets
    document.querySelectorAll('.planet').forEach(o => {
      if (o !== planet && (o.classList.contains('open') || o.classList.contains('closing'))) {
        closePlanet(o, false);
      }
    });

    if (planet._activeTL) {
      planet._activeTL.kill();
      planet._activeTL = null;
    }

    planet.classList.remove('closing');
    planet.classList.add('open', 'peeking');
    planet.setAttribute('aria-expanded', 'true');
    activeOpenPlanets.add(planet);

    // Awaken 3D render loop for active gaze tracking
    if (threeInstances && threeInstances[planet.id]) {
      threeInstances[planet.id].requestRender();
    }

    const orbitEl = planet.querySelector('.orbit');
    const labelSvg = planet.querySelector('.label-svg');
    const img = planet.querySelector('.orb canvas') || planet.querySelector('.orb img');

    if (orbitEl) orbitEl.style.pointerEvents = 'auto';
    if (labelSvg) labelSvg.style.pointerEvents = 'none';

    const state = planetTabsState[planet.id];
    const tabsInPlanet = state ? state.tabElements : [];
    const coords = state ? state.coords : [];

    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf(img);
      if (labelSvg) gsap.killTweensOf(labelSvg);
      gsap.killTweensOf(tabsInPlanet);

      const tl = gsap.timeline({
        onComplete: () => {
          planet._activeTL = null;
        }
      });
      planet._activeTL = tl;

      // 1. Planet sphere scales to 1.03
      if (img) {
        tl.to(img, { scale: 1.03, duration: 0.35, ease: 'power2.out' }, 0);
      }

      // 2. Curved label fades out immediately
      if (labelSvg) {
        tl.to(labelSvg, { opacity: 0, duration: 0.15, ease: 'power2.out' }, 0);
      }

      // 3. Staggered tabs fanning out from inside the sphere (70% default opacity)
      if (tabsInPlanet.length > 0) {
        tl.fromTo(tabsInPlanet,
          {
            left: i => (coords[i] ? coords[i].startLeft : 0),
            top: i => (coords[i] ? coords[i].startTop : 0),
            scale: 0.45,
            opacity: 0
          },
          {
            left: i => (coords[i] ? coords[i].targetLeft : 0),
            top: i => (coords[i] ? coords[i].targetTop : 0),
            scale: 1,
            opacity: 0.7,
            duration: 0.35,
            ease: 'back.out(1.35)',
            stagger: { each: 0.02, from: 'center' }
          },
          0.04
        );
      }
    } else {
      if (labelSvg) labelSvg.style.opacity = '0';
      tabsInPlanet.forEach((tab, i) => {
        if (coords[i]) {
          tab.style.left = coords[i].targetLeft + 'px';
          tab.style.top = coords[i].targetTop + 'px';
          tab.style.opacity = '0.7';
          tab.style.transform = 'scale(1)';
        }
      });
    }
  }

  // Close planet smoothly to default state
  function closePlanet(planet, isHoveredStill = false) {
    if (!planet || (!planet.classList.contains('open') && !planet.classList.contains('closing'))) return;

    if (planet._activeTL) {
      planet._activeTL.kill();
      planet._activeTL = null;
    }

    const orbitEl = planet.querySelector('.orbit');
    const labelSvg = planet.querySelector('.label-svg');
    const img = planet.querySelector('.orb canvas') || planet.querySelector('.orb img');
    const state = planetTabsState[planet.id];
    const tabsInPlanet = state ? state.tabElements : [];
    const coords = state ? state.coords : [];

    planet.querySelectorAll('.tab-name').forEach(lbl => lbl.classList.remove('visible'));

    planet.classList.add('closing');
    planet.classList.remove('open');
    planet.setAttribute('aria-expanded', 'false');
    activeOpenPlanets.delete(planet);

    // Awaken 3D render loop for smooth return to resting pose
    if (threeInstances && threeInstances[planet.id]) {
      threeInstances[planet.id].requestRender();
    }

    const orbWrap = planet.querySelector('.orb-wrap');
    if (orbWrap) orbWrap.classList.remove('is-clicked');
    if (!isHoveredStill) {
      planet.classList.remove('peeking');
    }

    if (orbitEl) orbitEl.style.pointerEvents = 'none';
    if (labelSvg) labelSvg.style.pointerEvents = 'none';

    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf(tabsInPlanet);
      if (labelSvg) gsap.killTweensOf(labelSvg);
      if (img) gsap.killTweensOf(img);

      const tl = gsap.timeline({
        onComplete: () => {
          planet.classList.remove('closing');
          planet._activeTL = null;
          if (orbitEl) orbitEl.style.pointerEvents = '';
          if (labelSvg) {
            labelSvg.style.pointerEvents = '';
            labelSvg.style.opacity = '1';
          }
        }
      });
      planet._activeTL = tl;

      // 1. Tab icons collapse inward toward sphere rim and dissolve quickly
      if (tabsInPlanet.length > 0) {
        tl.to(tabsInPlanet, {
          left: i => (coords[i] ? coords[i].startLeft : 0),
          top: i => (coords[i] ? coords[i].startTop : 0),
          scale: 0.35,
          opacity: 0,
          duration: 0.2,
          ease: 'power2.in',
          stagger: { each: 0.015, from: 'edges' }
        }, 0);
      }

      // 2. Curved label rises and fades smoothly back into view only after tabs have faded
      if (labelSvg) {
        tl.fromTo(labelSvg,
          { opacity: 0 },
          { opacity: 1, duration: 0.26, ease: 'power2.out' },
          0.18
        );
      }

      // 3. Planet image smoothly eases back to 1.0 (or 1.05 if still hovered)
      if (img) {
        tl.to(img, {
          scale: isHoveredStill ? 1.05 : 1.0,
          duration: 0.3,
          ease: 'power2.out'
        }, 0);
      }
    } else {
      planet.classList.remove('closing');
      if (labelSvg) {
        labelSvg.style.opacity = '1';
        labelSvg.style.pointerEvents = '';
      }
      tabsInPlanet.forEach((tab, i) => {
        if (coords[i]) {
          tab.style.left = coords[i].startLeft + 'px';
          tab.style.top = coords[i].startTop + 'px';
          tab.style.opacity = '0';
          tab.style.transform = 'scale(0.45)';
        }
      });
    }
  }

  // Fast O(1) distance calculation to planet cluster center (zero layout thrashing)
  function getMinDistanceToPlanetCluster(mouseX, mouseY, planet) {
    const rect = planet.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = mouseX - cx;
    const dy = mouseY - cy;
    const distCenter = Math.sqrt(dx * dx + dy * dy);

    const state = planetTabsState[planet.id];
    const clusterR = state ? state.clusterRadius : (rect.width / 2 + 50);

    return Math.max(0, distCenter - clusterR);
  }

  // Setup planet DOM event listeners
  document.querySelectorAll('.planet').forEach(p => {
    const img = p.querySelector('.orb canvas') || p.querySelector('.orb img');

    p.addEventListener('mouseenter', () => {
      p.classList.add('peeking');
      if (!p.classList.contains('open') && !p.classList.contains('closing') && img && typeof gsap !== 'undefined') {
        gsap.killTweensOf(img);
        gsap.to(img, { scale: 1.05, duration: 0.32, ease: 'power2.out', overwrite: 'auto' });
      }
    });

    p.addEventListener('mouseleave', e => {
      if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.planet') === p) return;
      if (!p.classList.contains('open') && !p.classList.contains('closing')) {
        p.classList.remove('peeking');
        if (img && typeof gsap !== 'undefined') {
          gsap.killTweensOf(img);
          gsap.to(img, { scale: 1.0, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
        }
      } else if (p.classList.contains('open')) {
        const dist = getMinDistanceToPlanetCluster(e.clientX, e.clientY, p);
        if (dist > 50) {
          closePlanet(p, false);
        }
      }
    });

    p.addEventListener('click', () => {
      const orbWrap = p.querySelector('.orb-wrap');
      if (orbWrap) orbWrap.classList.add('is-clicked');
      if (!p.classList.contains('open')) {
        openPlanet(p);
      }
      const cursor = document.getElementById('customCursor');
      if (cursor) cursor.classList.add('on');
    });

    p.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPlanet(p);
      }
      if (e.key === 'Escape') {
        closePlanet(p, false);
      }
    });
  });

  // Label interaction sync
  document.querySelectorAll('.label-svg').forEach(lbl => {
    const p = lbl.closest('.planet');
    if (!p) return;
    const img = p.querySelector('.orb canvas') || p.querySelector('.orb img');
    const target = lbl.querySelector('text') || lbl;

    target.addEventListener('mouseenter', () => {
      p.classList.add('peeking');
      if (!p.classList.contains('open') && !p.classList.contains('closing') && img && typeof gsap !== 'undefined') {
        gsap.killTweensOf(img);
        gsap.to(img, { scale: 1.05, duration: 0.32, ease: 'power2.out', overwrite: 'auto' });
      }
    });

    target.addEventListener('mouseleave', e => {
      if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.planet') === p) return;
      if (!p.classList.contains('open') && !p.classList.contains('closing')) {
        p.classList.remove('peeking');
        if (img && typeof gsap !== 'undefined') {
          gsap.killTweensOf(img);
          gsap.to(img, { scale: 1.0, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
        }
      } else if (p.classList.contains('open')) {
        const dist = getMinDistanceToPlanetCluster(e.clientX, e.clientY, p);
        if (dist > 50) {
          closePlanet(p, false);
        }
      }
    });

    target.addEventListener('click', e => {
      e.stopPropagation();
      openPlanet(p);
      const cursor = document.getElementById('customCursor');
      if (cursor) cursor.classList.add('on');
    });
  });

  // Click empty field closes any open planets smoothly
  const fieldEl = document.getElementById('field');
  if (fieldEl) {
    fieldEl.addEventListener('click', e => {
      if (e.target.id === 'field') {
        activeOpenPlanets.forEach(o => closePlanet(o, false));
        document.querySelectorAll('.orb-wrap.is-clicked').forEach(ow => ow.classList.remove('is-clicked'));
      }
    });
  }

  // Orb glow hover interaction
  document.querySelectorAll('.orb-wrap').forEach(orbWrap => {
    orbWrap.addEventListener('pointerenter', () => orbWrap.classList.add('is-hovered'));
    orbWrap.addEventListener('pointerleave', () => orbWrap.classList.remove('is-hovered'));
  });

  return {
    openPlanet,
    closePlanet,
    activeOpenPlanets,
    getMinDistanceToPlanetCluster
  };
}
