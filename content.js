/**
 * Comet Starting Page - Content Script Mode
 * Injects ONLY the 3D Planets & Tab folders into the live Comet / Perplexity page,
 * leaving the native sidebar, real search logic, account, and header completely intact.
 */

(async function initCometExtension() {
  // Prevent duplicate injections
  if (document.getElementById('comet-field-root')) return;

  console.log('[Comet Extension] Initializing interactive planet overlay...');

  // Helper for extension asset URLs
  function getExtUrl(path) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL(path.replace(/^\.\//, ''));
    }
    return path;
  }

  // Inject stylesheet if not already injected
  if (!document.getElementById('comet-extension-styles')) {
    const link = document.createElement('link');
    link.id = 'comet-extension-styles';
    link.rel = 'stylesheet';
    link.href = getExtUrl('styles.css');
    document.head.appendChild(link);
  }

  // Load Three.js and GSAP if not on page
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = getExtUrl(src);
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  if (typeof THREE === 'undefined') {
    try {
      await loadScript('three.min.js');
    } catch (e) {
      console.error('[Comet Extension] Failed to load Three.js', e);
    }
  }

  if (typeof gsap === 'undefined') {
    try {
      await loadScript('gsap.min.js');
    } catch (e) {
      console.error('[Comet Extension] Failed to load GSAP', e);
    }
  }

  // Create Field Container
  const fieldContainer = document.createElement('div');
  fieldContainer.id = 'comet-field-root';
  fieldContainer.className = 'field';
  fieldContainer.style.position = 'fixed';
  fieldContainer.style.inset = '0';
  fieldContainer.style.pointerEvents = 'none';
  fieldContainer.style.zIndex = '1';

  fieldContainer.innerHTML = `
    <!-- AI Planet -->
    <div class="planet" id="p-ai" data-size="md" data-name="AI" tabindex="0" aria-label="AI tab folder">
      <svg class="label-svg" viewBox="0 0 280 280">
        <path id="arc-ai" d="M 75.5,55.9 A 106 106 0 0 1 204.5,55.9" fill="none"/>
        <text><textPath href="#arc-ai" startOffset="50%" text-anchor="middle">AI</textPath></text>
      </svg>
      <div class="orbit"></div>
      <div class="orb orb-wrap ai">
        <div class="orb-glow"></div>
        <img src="${getExtUrl('Planets/planet-avatars.png')}" alt="AI tab folder" />
        <canvas id="p-ai-canvas" class="planet-3d-canvas" width="344" height="344"></canvas>
      </div>
    </div>

    <!-- Entertainment Planet -->
    <div class="planet" id="p-ent" data-size="sm" data-name="Entertainment" tabindex="0" aria-label="Entertainment tab folder">
      <svg class="label-svg" viewBox="0 0 200 200">
        <path id="arc-ent" d="M 44.2,95.1 A 56 56 0 0 1 155.8,95.1" fill="none"/>
        <text><textPath href="#arc-ent" startOffset="50%" text-anchor="middle">Entertainment</textPath></text>
      </svg>
      <div class="orbit"></div>
      <div class="orb orb-wrap entertainment">
        <div class="orb-glow"></div>
        <img src="${getExtUrl('Planets/planet-with-hover-1.png')}" alt="Entertainment" />
        <canvas id="p-ent-canvas" class="planet-3d-canvas" width="168" height="168"></canvas>
      </div>
    </div>

    <!-- Social Media Planet -->
    <div class="planet" id="p-soc" data-size="md" data-name="Social media" tabindex="0" aria-label="Social media tab folder">
      <svg class="label-svg" viewBox="0 0 420 420">
        <path id="arc-soc" d="M 86,270.5 A 138 138 0 0 1 318.7,125" fill="none"/>
        <text><textPath href="#arc-soc" startOffset="50%" text-anchor="middle">Social media</textPath></text>
      </svg>
      <div class="orbit"></div>
      <div class="orb orb-wrap social-media">
        <div class="orb-glow"></div>
        <img src="${getExtUrl('Planets/planet-with-hover-6.png')}" alt="Social media" />
        <canvas id="p-soc-canvas" class="planet-3d-canvas" width="456" height="456"></canvas>
      </div>
    </div>

    <!-- Music Planet -->
    <div class="planet" id="p-mus" data-size="sm" data-name="Music" tabindex="0" aria-label="Music tab folder">
      <svg class="label-svg" viewBox="0 0 240 240">
        <path id="arc-mus" d="M 100,47.7 A 75 75 0 0 1 194,132.4" fill="none"/>
        <text><textPath href="#arc-mus" startOffset="50%" text-anchor="middle">Music</textPath></text>
      </svg>
      <div class="orbit"></div>
      <div class="orb orb-wrap music">
        <div class="orb-glow"></div>
        <img src="${getExtUrl('Planets/planet-with-hover-4.png')}" alt="Music" />
        <canvas id="p-mus-canvas" class="planet-3d-canvas" width="236" height="236"></canvas>
      </div>
    </div>

    <!-- Design Planet -->
    <div class="planet" id="p-des" data-size="lg" data-name="Design" tabindex="0" aria-label="Design tab folder">
      <svg class="label-svg" viewBox="0 0 400 90">
        <path id="arc-des" d="M20,78 Q200,2 380,68" fill="none"/>
        <text><textPath href="#arc-des" startOffset="50%" text-anchor="middle">Design</textPath></text>
      </svg>
      <div class="orbit" id="orbit-des"></div>
      <div class="orb orb-wrap design">
        <div class="orb-glow"></div>
        <img src="${getExtUrl('Planets/planet-with-hover-5.png')}" alt="Design tab folder" />
        <canvas id="p-des-canvas" class="planet-3d-canvas" width="608" height="608"></canvas>
      </div>
    </div>
  `;

  // Attach to body
  document.body.appendChild(fieldContainer);

  // Allow pointer events on the planets themselves
  const planets = fieldContainer.querySelectorAll('.planet, .tab-dot, .orb');
  planets.forEach(p => { p.style.pointerEvents = 'auto'; });

  // Dynamically import interaction modules
  try {
    const { initInteractive3DPlanets } = await import(getExtUrl('js/planet-3d.js'));
    const { initPlanetInteractions } = await import(getExtUrl('js/planet-interactions.js'));

    initInteractive3DPlanets();
    initPlanetInteractions();

    console.log('[Comet Extension] Planets successfully injected onto homepage.');
  } catch (err) {
    console.error('[Comet Extension] Error initializing planets:', err);
  }
})();
