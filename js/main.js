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

  // 4. Search input & form integration
  const searchInput = document.getElementById('search-input');
  const searchForm = document.getElementById('search-form');
  const proChip = document.querySelector('.pro-chip');

  if (proChip) {
    proChip.addEventListener('click', () => {
      proChip.classList.toggle('active');
    });
  }

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      const query = searchInput.value.trim();
      if (!query) {
        e.preventDefault();
        searchInput.focus();
        return;
      }
      // If Pro search is active, pass copilot param
      if (proChip && proChip.classList.contains('active')) {
        e.preventDefault();
        window.location.href = `https://www.perplexity.ai/search?q=${encodeURIComponent(query)}&copilot=true`;
      }
    });

    window.addEventListener('keydown', e => {
      // '/' or Cmd+K / Ctrl+K focuses search if not currently focused
      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  // 5. History drawer toggle
  const historyBtn = document.getElementById('historyToggleBtn');
  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      window.location.href = 'https://www.perplexity.ai/library';
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
