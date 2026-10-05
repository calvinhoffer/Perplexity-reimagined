/**
 * 3D Interactive WebGL Planet Spheres powered by Three.js
 * Features:
 * - High-performance on-demand render loop (0% idle GPU usage when settled)
 * - Equirectangular reprojection with pixel-perfect frontal alignment
 * - Additive Fresnel atmosphere shell
 * - Gaze cursor tracking, inertial rotation, and momentum damping
 * - Wheel and touch interaction support
 */

export function setupPlanet3DSphere(config) {
  const canvas = document.getElementById(config.canvasId);
  const planetEl = document.getElementById(config.planetId);
  if (!canvas || !planetEl) return null;

  if (typeof THREE === 'undefined') {
    console.warn(`Three.js not yet loaded, retrying for ${config.planetId}...`);
    setTimeout(() => setupPlanet3DSphere(config), 80);
    return null;
  }

  const size = config.size || 304;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  // Browser zoom changes devicePixelRatio/CSS scale but the canvas backing
  // store stays frozen -> visible pixelation. Refit on resize (fires on zoom).
  function fitRenderer() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const s = canvas.clientWidth || size;
    renderer.setSize(s, s, false);
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', fitRenderer);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  camera.position.z = 5;
  camera.lookAt(0, 0, 0);

  const hemiIntensity = config.hemiIntensity !== undefined ? config.hemiIntensity : 1.4;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, hemiIntensity);
  scene.add(hemi);

  const keyColor = config.keyColor !== undefined ? config.keyColor : 0xffffff;
  const keyIntensity = config.keyIntensity !== undefined ? config.keyIntensity : 1.6;
  const key = new THREE.DirectionalLight(keyColor, keyIntensity);
  key.position.set(3, 2, 4);
  scene.add(key);

  const sphereGroup = new THREE.Group();
  scene.add(sphereGroup);

  let sphereMesh = null;
  let glowMesh = null;
  let modelWrap = null;
  let spinNode = null; // sphereMesh (flat path) or model wrap (GLB path)
  let rotX = 0;
  let rotY = 0;
  let baseRotX = 0;
  let baseRotY = 0;
  let wasOpen = false;
  let velX = 0;
  let velY = 0;
  let targetRotY = 0;

  let isMouseOverSphere = false;
  let isRenderLoopRunning = false;

  const glowColorVec = config.glowColor || 'vec3(1.0, 0.98, 0.95)';
  const glowIntensity = config.glowIntensity !== undefined ? config.glowIntensity : 0.28;

  function requestLoop() {
    if (!isRenderLoopRunning) {
      isRenderLoopRunning = true;
      requestAnimationFrame(render);
    }
  }

  let currentTexture = null;

  function addGlow() {
    if (config.noFresnel || !(glowIntensity > 0)) return;
    if (glowMesh) sphereGroup.remove(glowMesh);

    const glowGeo = new THREE.SphereGeometry(1.006, 64, 64);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float fresnel = pow(1.0 - abs(vNormal.z), 3.2);
          gl_FragColor = vec4(${glowColorVec} * (fresnel * ${glowIntensity.toFixed(2)}), fresnel * ${glowIntensity.toFixed(2)});
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide
    });
    glowMesh = new THREE.Mesh(glowGeo, glowMat);
    sphereGroup.add(glowMesh);
  }

  function buildMesh(texture) {
    currentTexture = texture;
    if (sphereMesh) sphereGroup.remove(sphereMesh);
    if (modelWrap) {
      sphereGroup.remove(modelWrap);
      modelWrap = null;
    }

    const isBasic = config.useBasicMaterial === true;
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    let material;
    if (isBasic) {
      material = new THREE.MeshBasicMaterial({
        map: texture
      });
    } else {
      const roughness = config.roughness !== undefined ? config.roughness : 0.6;
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: roughness,
        metalness: 0
      });
    }
    sphereMesh = new THREE.Mesh(geometry, material);
    sphereGroup.add(sphereMesh);
    spinNode = sphereMesh;

    addGlow();

    // Initial render of static frontal view
    renderer.render(scene, camera);
  }

  // GLB model path (e.g. Design planet): used as-authored, recentered and
  // uniformly scaled to unit bounding radius so framing, hover scale-up and
  // the fresnel glow stay pixel-identical to the procedural sphere.
  function loadGLBModel() {
    return new Promise((resolve, reject) => {
      let loader;
      try {
        loader = new THREE.GLTFLoader();
      } catch (e) {
        reject(e);
        return;
      }
      loader.load(config.glbSrc,
        gltf => {
          try {
            const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model) throw new Error('GLB contains no scene');
            if (sphereMesh) {
              sphereGroup.remove(sphereMesh);
              sphereMesh = null;
            }
            if (modelWrap) {
              sphereGroup.remove(modelWrap);
              modelWrap = null;
            }
            modelWrap = new THREE.Group();
            modelWrap.add(model);
            // Optional per-planet roughness tune for authored GLB materials
            // (higher = softer specular response, less washout under the key)
            if (config.roughnessOverride !== undefined) {
              modelWrap.traverse(o => {
                if (o.isMesh && o.material && 'roughness' in o.material) {
                  o.material.roughness = config.roughnessOverride;
                  o.material.needsUpdate = true;
                }
              });
            }
            const box = new THREE.Box3().setFromObject(model);
            // Fit by longest box edge (not bounding-sphere-of-box, which
            // overestimates spheres: sqrt(3) for a unit sphere and shrinks it)
            const edge = new THREE.Vector3();
            box.getSize(edge);
            const extent = Math.max(edge.x, edge.y, edge.z) / 2;
            if (!(extent > 0)) throw new Error('GLB has empty bounds');
            model.position.sub(box.getCenter(new THREE.Vector3()));
            modelWrap.scale.setScalar(1 / extent);
            sphereGroup.add(modelWrap);
            spinNode = modelWrap;
            addGlow();
            renderer.render(scene, camera);
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        undefined,
        err => reject(err || new Error('GLB load error'))
      );
    });
  }

  // Equirectangular spherical texture mapping from a flat image (fallback path)
  function loadFlatTexture() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const offCanvas = document.createElement('canvas');
        const W = 1024;
        const H = 512;
        offCanvas.width = W;
        offCanvas.height = H;
        const ctx = offCanvas.getContext('2d');

        const srcCanvas = document.createElement('canvas');
        const sw = img.naturalWidth || 888;
        const sh = img.naturalHeight || 888;
        srcCanvas.width = sw;
        srcCanvas.height = sh;
        const sctx = srcCanvas.getContext('2d');
        sctx.drawImage(img, 0, 0);

        const srcData = sctx.getImageData(0, 0, sw, sh);
        const sPixels = srcData.data;
        const cx = sw / 2;
        const cy = sh / 2;
        const R = (Math.min(sw, sh) / 2) - 4;

        const outData = ctx.createImageData(W, H);
        const outPixels = outData.data;

        for (let j = 0; j < H; j++) {
          const v = j / (H - 1);
          const phi = (v - 0.5) * Math.PI;
          const cosPhi = Math.cos(phi);
          const y = Math.sin(phi);

          for (let i = 0; i < W; i++) {
            const u = i / (W - 1);
            const theta = (u - 0.25) * 2.0 * Math.PI;
            const x = cosPhi * Math.sin(theta);

            const imgX = Math.round(cx + x * R);
            const imgY = Math.round(cy - y * R);

            const clampX = Math.max(0, Math.min(sw - 1, imgX));
            const clampY = Math.max(0, Math.min(sh - 1, imgY));

            const sIdx = (clampY * sw + clampX) * 4;
            const oIdx = (j * W + i) * 4;

            outPixels[oIdx] = sPixels[sIdx];
            outPixels[oIdx + 1] = sPixels[sIdx + 1];
            outPixels[oIdx + 2] = sPixels[sIdx + 2];
            outPixels[oIdx + 3] = 255;
          }
        }

        ctx.putImageData(outData, 0, 0);

        const texture = new THREE.CanvasTexture(offCanvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;

        buildMesh(texture);
      } catch (err) {
        console.warn(`Fallback to standard texture for ${config.planetId}:`, err);
        const tex = new THREE.TextureLoader().load(config.imageSrc, () => {
          tex.encoding = THREE.sRGBEncoding;
          buildMesh(tex);
        });
      }
    };
    img.src = config.imageSrc;
  }

  // Texture source dispatch: external GLB model wins when configured,
  // flat-image reprojection is the automatic fallback.
  if (config.glbSrc && typeof THREE.GLTFLoader !== 'undefined') {
    loadGLBModel().catch(err => {
      console.warn(`GLB failed for ${config.planetId}, falling back to flat texture:`, err);
      loadFlatTexture();
    });
  } else {
    if (config.glbSrc) console.warn(`THREE.GLTFLoader unavailable, flat texture for ${config.planetId}`);
    loadFlatTexture();
  }

  // Interaction handlers
  const orbWrap = planetEl.querySelector('.orb-wrap') || canvas;
  let lastMouseX = null;
  let lastMouseY = null;
  let cursorNormX = 0;
  let cursorNormY = 0;

  orbWrap.addEventListener('mouseenter', e => {
    isMouseOverSphere = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    cursorNormX = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
    cursorNormY = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
    requestLoop();
  });

  orbWrap.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    cursorNormX = Math.max(-1, Math.min(1, (clientX - cx) / (rect.width / 2)));
    cursorNormY = Math.max(-1, Math.min(1, (clientY - cy) / (rect.height / 2)));

    if (lastMouseX !== null && lastMouseY !== null) {
      const deltaX = clientX - lastMouseX;
      const deltaY = clientY - lastMouseY;
      velY += Math.max(-0.012, Math.min(0.012, deltaX * 0.0014));
      velX += Math.max(-0.012, Math.min(0.012, deltaY * 0.0014));
    }

    lastMouseX = clientX;
    lastMouseY = clientY;
    requestLoop();
  });

  orbWrap.addEventListener('mouseleave', () => {
    isMouseOverSphere = false;
    lastMouseX = null;
    lastMouseY = null;
    cursorNormX = 0;
    cursorNormY = 0;
    targetRotY = 0;
    requestLoop();
  });

  window.addEventListener('blur', () => {
    isMouseOverSphere = false;
    targetRotY = 0;
    requestLoop();
  });

  orbWrap.addEventListener('wheel', e => {
    e.preventDefault();
    e.stopPropagation();

    const deltaFactor = e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? 300 : 1;
    const dy = e.deltaY * deltaFactor;
    const dx = e.deltaX * deltaFactor;

    velX += Math.max(-0.015, Math.min(0.015, dy * 0.0006));
    velY += Math.max(-0.015, Math.min(0.015, dx * 0.0006));
    baseRotX += velX;
    baseRotY += velY;
    requestLoop();
  }, { passive: false });

  // Touch swipe support
  let touchStartX = 0;
  let touchStartY = 0;
  orbWrap.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isMouseOverSphere = true;
      requestLoop();
    }
  }, { passive: true });

  orbWrap.addEventListener('touchmove', e => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      velX -= Math.max(-0.015, Math.min(0.015, dy * 0.002));
      velY += Math.max(-0.015, Math.min(0.015, dx * 0.002));
      baseRotX += velX;
      baseRotY += velY;
      requestLoop();
    }
  }, { passive: true });

  orbWrap.addEventListener('touchend', () => {
    isMouseOverSphere = false;
    targetRotY = 0;
    requestLoop();
  }, { passive: true });

  // WebGL context recovery
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    isRenderLoopRunning = false;
  }, false);

  canvas.addEventListener('webglcontextrestored', () => {
    if (config.glbSrc && typeof THREE.GLTFLoader !== 'undefined') {
      loadGLBModel().catch(() => {
        if (currentTexture) buildMesh(currentTexture);
        else loadFlatTexture();
      });
    } else if (currentTexture) buildMesh(currentTexture);
    requestLoop();
  }, false);

  const hoverSpinRate = config.hoverSpinRate !== undefined ? config.hoverSpinRate : 0.0018;

  function render() {
    if (!spinNode) {
      isRenderLoopRunning = false;
      return;
    }

    const isOpen = planetEl.classList.contains('open');
    let needsContinue = false;

    if (isOpen) {
      needsContinue = true;
      if (!wasOpen) {
        baseRotX = rotX;
        baseRotY = rotY;
        wasOpen = true;
      }

      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const globalMouseX = window.lastGlobalMouseX || (window.innerWidth / 2);
      const globalMouseY = window.lastGlobalMouseY || (window.innerHeight / 2);
      const dx = globalMouseX - cx;
      const dy = globalMouseY - cy;

      const reach = Math.max(90, rect.width * 0.54);
      const maxTilt = 0.76;
      const gazeX = Math.max(-maxTilt, Math.min(maxTilt, (dy / reach) * maxTilt));
      const gazeY = Math.max(-maxTilt, Math.min(maxTilt, (dx / reach) * maxTilt));

      const targetTiltX = baseRotX + gazeX;
      const targetTiltY = baseRotY + gazeY;

      rotX += (targetTiltX - rotX) * 0.22;
      rotY += (targetTiltY - rotY) * 0.22;

      velX = 0;
      velY = 0;
      targetRotY = 0;
    } else if (isMouseOverSphere) {
      needsContinue = true;
      wasOpen = false;
      velY += hoverSpinRate + cursorNormX * 0.00018;
      velX += cursorNormY * 0.00018;

      const maxVel = 0.032;
      velX = Math.max(-maxVel, Math.min(maxVel, velX));
      velY = Math.max(-maxVel, Math.min(maxVel, velY));

      rotX += velX;
      rotY += velY;

      baseRotX = rotX;
      baseRotY = rotY;

      velX *= 0.92;
      velY *= 0.92;

      if (Math.abs(velX) < 0.00002) velX = 0;
      if (Math.abs(velY) < 0.00002) velY = 0;
    } else {
      wasOpen = false;
      const diffX = 0 - rotX;
      const diffY = 0 - rotY;

      const ease = 0.042;
      rotX += diffX * ease + velX * 0.15;
      rotY += diffY * ease + velY * 0.15;

      velX *= 0.86;
      velY *= 0.86;

      if (Math.abs(diffX) < 0.0005 && Math.abs(diffY) < 0.0005 && Math.abs(velX) < 0.0001 && Math.abs(velY) < 0.0001) {
        // Settled cleanly at resting pose
        rotX = 0;
        rotY = 0;
        baseRotX = 0;
        baseRotY = 0;
        targetRotY = 0;
        velX = 0;
        velY = 0;
        needsContinue = false; // Idle! Pause loop to save 100% GPU/CPU
      } else {
        needsContinue = true;
      }
    }

    key.position.set(3 + rotY * 1.5, 2 - rotX * 1.5, 4);
    spinNode.rotation.x = rotX;
    spinNode.rotation.y = rotY;

    renderer.render(scene, camera);

    if (needsContinue) {
      requestAnimationFrame(render);
    } else {
      isRenderLoopRunning = false;
    }
  }

  // Public API to awaken render loop externally when opened or clicked
  return {
    requestRender: requestLoop
  };
}

export function initInteractive3DPlanets() {
  const instances = {
    'p-des': setupPlanet3DSphere({
      planetId: 'p-des',
      canvasId: 'p-des-canvas',
      imageSrc: './Planets/planet_design.png',
      glbSrc: './Planets/3d/planet_3d_design.glb',
      size: 304,
      noFresnel: true,
      glowColor: 'vec3(1.0, 0.98, 0.95)',
      hoverSpinRate: 0.0012
    }),
    'p-soc': setupPlanet3DSphere({
      planetId: 'p-soc',
      canvasId: 'p-soc-canvas',
      imageSrc: './Planets/planet_socialmedia.png',
      glbSrc: './Planets/3d/planet_3d_socialmedia.glb',
      size: 228,
      useBasicMaterial: true,
      noFresnel: true,
      keyIntensity: 0.85,
      hemiIntensity: 0.55,
      roughnessOverride: 0.8,
      hoverSpinRate: 0.0014
    }),
    'p-ai': setupPlanet3DSphere({
      planetId: 'p-ai',
      canvasId: 'p-ai-canvas',
      imageSrc: './Planets/planet_ai.png',
      glbSrc: './Planets/3d/planet_3d_ai.glb',
      size: 172,
      glowColor: 'vec3(0.92, 1.0, 0.96)',
      hoverSpinRate: 0.0016
    }),
    'p-mus': setupPlanet3DSphere({
      planetId: 'p-mus',
      canvasId: 'p-mus-canvas',
      imageSrc: './Planets/planet_music.png',
      glbSrc: './Planets/3d/planet_3d_music.glb',
      size: 118,
      glowColor: 'vec3(1.0, 0.82, 0.75)',
      hoverSpinRate: 0.0020
    }),
    'p-ent': setupPlanet3DSphere({
      planetId: 'p-ent',
      canvasId: 'p-ent-canvas',
      imageSrc: './Planets/planet_entertainment.png',
      size: 84,
      glowColor: 'vec3(1.0, 0.92, 0.82)',
      hoverSpinRate: 0.0022
    })
  };

  return instances;
}
