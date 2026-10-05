/**
 * Main Application Orchestrator — STATIC PNG VARIANT (branch: static-png-planets)
 * No WebGL: planets are crisp PNGs with CSS glow + GSAP grow on hover/click.
 * Bootstraps Orbit Tab Interactions and Custom Cursor only.
 */

import { initPlanetInteractions } from './planet-interactions.js';
import { initCustomCursor } from './cursor.js';

function bootstrap() {
  // 1. No 3D in this variant: drop WebGL canvases so interaction physics
  // falls through to the PNG images (querySelector '.orb canvas' || '.orb img')
  document.querySelectorAll('.planet-3d-canvas').forEach(c => c.remove());
  const threeInstances = null;

  // 2. Initialize orbit tabs and interaction physics
  const planetManager = initPlanetInteractions(threeInstances);

  // 3. Initialize custom cursor tracking
  initCustomCursor(planetManager);

  // 4. Search input focus enhancement
  const searchInput = document.querySelector('.box input');
  if (searchInput) {
    window.addEventListener('keydown', e => {
      // '/' focuses search if not currently focused
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
