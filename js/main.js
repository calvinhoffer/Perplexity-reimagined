/**
 * Main Application Orchestrator
 * Bootstraps 3D WebGL Spheres, Orbit Tab Interactions, and Custom Cursor
 */

import { initInteractive3DPlanets } from './planet-3d.js';
import { initPlanetInteractions } from './planet-interactions.js';
import { initCustomCursor } from './cursor.js';

function bootstrap() {
  // 1. Initialize 3D WebGL planets
  const threeInstances = initInteractive3DPlanets();

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
