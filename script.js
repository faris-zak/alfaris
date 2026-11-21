const fieldJournalDate = document.querySelector('[data-field-journal-date]');
if (fieldJournalDate) {
  const now = new Date();
  const timeZone = 'Asia/Muscat';
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const { year, month, day } = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  const shortMonth = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' }).format(now);

  fieldJournalDate.dateTime = `${year}-${month}-${day}`;
  fieldJournalDate.textContent = `${day}-${shortMonth}-${year.slice(-2)}`;
  fieldJournalDate.before('/ ');
  fieldJournalDate.hidden = false;
}

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
const performanceToggle = document.querySelector('[data-performance-toggle]');
const originFigure = document.querySelector('.hero__portrait');
const originTrigger = document.querySelector('[data-origin-trigger]');
const originGlobe = document.querySelector('[data-origin-globe]');
const originGlobeCanvas = document.querySelector('[data-origin-globe-canvas]');
const performanceStorageKey = 'alfaris-performance-mode';
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = motionPreference.matches;
const isPerformanceMode = () => document.documentElement.classList.contains('performance-mode');
const shouldReduceDecorativeMotion = () => reducedMotion || isPerformanceMode();

const syncPerformanceToggle = () => {
  if (!performanceToggle) {
    return;
  }

  const isActive = isPerformanceMode();
  performanceToggle.setAttribute('aria-pressed', String(isActive));
};

const setPerformanceMode = (isActive) => {
  document.documentElement.classList.toggle('performance-mode', isActive);
  document.body.classList.toggle('performance-mode', isActive);
  syncPerformanceToggle();

  try {
    localStorage.setItem(performanceStorageKey, String(isActive));
  } catch {
    // Storage can be blocked in private or strict browsing modes.
  }

  window.dispatchEvent(new CustomEvent('performance-mode-change', {
    detail: { isActive },
  }));
};

document.body.classList.toggle('performance-mode', isPerformanceMode());
syncPerformanceToggle();

if (performanceToggle) {
  performanceToggle.addEventListener('click', () => {
    setPerformanceMode(!isPerformanceMode());
  });
}

const createOriginGlobe = () => {
  let threeModulePromise;
  let topoJsonModulePromise;
  let worldAtlasPromise;
  let renderer;
  let scene;
  let camera;
  let globeGroup;
  let baseQuaternion;
  let frameId;
  let isReady = false;
  let isVisible = false;
  let lastWidth = 0;
  let lastHeight = 0;
  let revealStartedAt = 0;

  const omanCoordinates = { lat: 23.61, lon: 58.59 };
  const sphereRadius = 1.55;
  const worldAtlasUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const revealZoomDuration = 1800;
  const cameraZoomStart = 6.9;
  const cameraZoomEnd = 4.7;
  const globeScaleStart = 0.76;
  const globeScaleEnd = 1;

  const canUseGlobe = () => (
    originFigure
    && originTrigger
    && originGlobe
    && originGlobeCanvas
  );

  const hasWebGlSupport = () => {
    try {
      const testCanvas = document.createElement('canvas');
      return Boolean(testCanvas.getContext('webgl2') || testCanvas.getContext('webgl'));
    } catch {
      return false;
    }
  };

  const loadThree = () => {
    if (!threeModulePromise) {
      threeModulePromise = import('https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js');
    }

    return threeModulePromise;
  };

  const loadTopoJson = () => {
    if (!topoJsonModulePromise) {
      topoJsonModulePromise = import('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm');
    }

    return topoJsonModulePromise;
  };

  const loadWorldAtlas = async () => {
    if (!worldAtlasPromise) {
      worldAtlasPromise = fetch(worldAtlasUrl).then((response) => {
        if (!response.ok) {
          throw new Error('World atlas unavailable');
        }

        return response.json();
      });
    }

    return worldAtlasPromise;
  };

  const latLonToVector = (THREE, latitude, longitude, radius = sphereRadius) => {
    const phi = THREE.MathUtils.degToRad(90 - latitude);
    const theta = THREE.MathUtils.degToRad(longitude);

    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta),
    );
  };

  const easeOutCubic = (progress) => 1 - ((1 - progress) ** 3);

  const buildPointCloud = (THREE) => {
    const positions = [];

    for (let lat = -78; lat <= 78; lat += 4) {
      const densityOffset = Math.abs(lat % 8) === 0 ? 0 : 2;

      for (let lon = -180 + densityOffset; lon < 180; lon += 4) {
        const point = latLonToVector(THREE, lat, lon);
        positions.push(point.x, point.y, point.z);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0x86e5e0,
        size: 0.012,
        transparent: true,
        opacity: 0.32,
        depthTest: true,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
  };

  const buildGlobeShell = (THREE) => (
    new THREE.Mesh(
      new THREE.SphereGeometry(sphereRadius * 0.997, 48, 32),
      new THREE.MeshBasicMaterial({
        color: 0x030712,
        transparent: true,
        opacity: 0.74,
        depthWrite: true,
      }),
    )
  );

  const buildGridLines = (THREE) => {
    const positions = [];
    const pushLine = (start, end) => {
      positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
    };

    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = -180; lon < 180; lon += 6) {
        pushLine(latLonToVector(THREE, lat, lon, sphereRadius * 1.006), latLonToVector(THREE, lat, lon + 6, sphereRadius * 1.006));
      }
    }

    for (let lon = -150; lon <= 180; lon += 30) {
      for (let lat = -78; lat < 78; lat += 6) {
        pushLine(latLonToVector(THREE, lat, lon, sphereRadius * 1.008), latLonToVector(THREE, lat + 6, lon, sphereRadius * 1.008));
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    return new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color: 0x86e5e0,
        transparent: true,
        opacity: 0.08,
        depthTest: true,
        depthWrite: false,
      }),
    );
  };

  const coordinatesToSegments = (THREE, coordinates, radius) => {
    const positions = [];

    for (let index = 0; index < coordinates.length - 1; index += 1) {
      const [startLon, startLat] = coordinates[index];
      const [endLon, endLat] = coordinates[index + 1];

      if (![startLon, startLat, endLon, endLat].every(Number.isFinite)) {
        continue;
      }

      const start = latLonToVector(THREE, startLat, startLon, radius);
      const end = latLonToVector(THREE, endLat, endLon, radius);
      positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
    }

    return positions;
  };

  const lineGeometryToSegments = (THREE, geometry, radius) => {
    if (!geometry) {
      return [];
    }

    if (geometry.type === 'LineString') {
      return coordinatesToSegments(THREE, geometry.coordinates, radius);
    }

    if (geometry.type === 'MultiLineString') {
      return geometry.coordinates.flatMap((line) => coordinatesToSegments(THREE, line, radius));
    }

    return [];
  };

  const polygonGeometryToSegments = (THREE, geometry, radius) => {
    if (!geometry) {
      return [];
    }

    if (geometry.type === 'Polygon') {
      return geometry.coordinates.flatMap((ring) => coordinatesToSegments(THREE, ring, radius));
    }

    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.flatMap((polygon) => (
        polygon.flatMap((ring) => coordinatesToSegments(THREE, ring, radius))
      ));
    }

    return [];
  };

  const ringToTrianglePositions = (THREE, ring, radius) => {
    if (!ring || ring.length < 4) {
      return [];
    }

    const centroid = ring.reduce((total, [longitude, latitude]) => ({
      lon: total.lon + longitude,
      lat: total.lat + latitude,
    }), { lon: 0, lat: 0 });
    const center = [
      centroid.lon / ring.length,
      centroid.lat / ring.length,
    ];
    const centerVector = latLonToVector(THREE, center[1], center[0], radius);
    const positions = [];

    for (let index = 0; index < ring.length - 1; index += 1) {
      const [startLon, startLat] = ring[index];
      const [endLon, endLat] = ring[index + 1];
      const start = latLonToVector(THREE, startLat, startLon, radius);
      const end = latLonToVector(THREE, endLat, endLon, radius);

      positions.push(
        centerVector.x, centerVector.y, centerVector.z,
        start.x, start.y, start.z,
        end.x, end.y, end.z,
      );
    }

    return positions;
  };

  const polygonGeometryToFillTriangles = (THREE, geometry, radius) => {
    if (!geometry) {
      return [];
    }

    if (geometry.type === 'Polygon') {
      return ringToTrianglePositions(THREE, geometry.coordinates[0], radius);
    }

    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.flatMap((polygon) => (
        ringToTrianglePositions(THREE, polygon[0], radius)
      ));
    }

    return [];
  };

  const collectCoordinatePairs = (coordinates, pairs = []) => {
    if (!Array.isArray(coordinates)) {
      return pairs;
    }

    if (
      coordinates.length >= 2
      && typeof coordinates[0] === 'number'
      && typeof coordinates[1] === 'number'
    ) {
      pairs.push(coordinates);
      return pairs;
    }

    coordinates.forEach((item) => collectCoordinatePairs(item, pairs));
    return pairs;
  };

  const buildLineSegments = (THREE, positions, material) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    return new THREE.LineSegments(geometry, material);
  };

  const isNearOman = (feature) => {
    const coordinates = collectCoordinatePairs(feature.geometry.coordinates);

    return coordinates.some(([longitude, latitude]) => (
      Math.abs(latitude - omanCoordinates.lat) < 32
      && Math.abs(longitude - omanCoordinates.lon) < 45
    ));
  };

  const buildWorldMapLayers = (THREE, worldAtlas, topojson) => {
    const mapGroup = new THREE.Group();
    const countryFeatures = topojson.feature(worldAtlas, worldAtlas.objects.countries).features;
    const countryBorders = topojson.mesh(worldAtlas, worldAtlas.objects.countries, (left, right) => left !== right);
    const coastlines = topojson.mesh(worldAtlas, worldAtlas.objects.land);
    const omanFeature = countryFeatures.find((feature) => feature.id === '512' || feature.properties?.name === 'Oman');
    const regionalFeatures = countryFeatures.filter((feature) => feature !== omanFeature && isNearOman(feature));
    const globalBorderPositions = [
      ...lineGeometryToSegments(THREE, coastlines, sphereRadius * 1.064),
      ...lineGeometryToSegments(THREE, countryBorders, sphereRadius * 1.068),
    ];
    const regionalPositions = regionalFeatures.flatMap((feature) => (
      polygonGeometryToSegments(THREE, feature.geometry, sphereRadius * 1.074)
    ));
    const omanPositions = omanFeature
      ? polygonGeometryToSegments(THREE, omanFeature.geometry, sphereRadius * 1.092)
      : [];
    const omanFillPositions = omanFeature
      ? polygonGeometryToFillTriangles(THREE, omanFeature.geometry, sphereRadius * 1.084)
      : [];

    mapGroup.add(buildLineSegments(
      THREE,
      globalBorderPositions,
      new THREE.LineBasicMaterial({
        color: 0x86e5e0,
        transparent: true,
        opacity: 0.24,
        depthTest: true,
        depthWrite: false,
      }),
    ));

    mapGroup.add(buildLineSegments(
      THREE,
      regionalPositions,
      new THREE.LineBasicMaterial({
        color: 0x86e5e0,
        transparent: true,
        opacity: 0.34,
        depthTest: true,
        depthWrite: false,
      }),
    ));

    if (omanPositions.length) {
      if (omanFillPositions.length) {
        const fillGeometry = new THREE.BufferGeometry();
        fillGeometry.setAttribute('position', new THREE.Float32BufferAttribute(omanFillPositions, 3));
        mapGroup.add(new THREE.Mesh(
          fillGeometry,
          new THREE.MeshBasicMaterial({
            color: 0xf4b860,
            transparent: true,
            opacity: 0.15,
            depthTest: true,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        ));
      }

      const omanGlow = buildLineSegments(
        THREE,
        omanPositions,
        new THREE.LineBasicMaterial({
          color: 0xf4b860,
          transparent: true,
          opacity: 0.28,
          depthTest: true,
          depthWrite: false,
        }),
      );
      const omanBorder = buildLineSegments(
        THREE,
        omanPositions,
        new THREE.LineBasicMaterial({
          color: 0xf4b860,
          transparent: true,
          opacity: 0.96,
          depthTest: true,
          depthWrite: false,
        }),
      );

      omanGlow.scale.setScalar(1.006);
      mapGroup.add(omanGlow);
      mapGroup.add(omanBorder);
    }

    return mapGroup;
  };

  const buildCountryLabel = (THREE, label, latitude, longitude) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const markerPosition = latLonToVector(THREE, latitude + 1.2, longitude + 1.1, sphereRadius * 1.42);

    canvas.width = 256;
    canvas.height = 96;
    context.font = '700 34px IBM Plex Mono, monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'rgba(6, 11, 24, 0.78)';
    context.strokeStyle = 'rgba(244, 184, 96, 0.82)';
    context.lineWidth = 2;
    context.strokeRect(52, 22, 152, 52);
    context.fillRect(52, 22, 152, 52);
    context.fillStyle = '#f4b860';
    context.fillText(label, 128, 50);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }));

    sprite.position.copy(markerPosition);
    sprite.scale.set(0.62, 0.23, 1);

    return sprite;
  };

  const buildOmanPulse = (THREE) => {
    const pulsePosition = latLonToVector(THREE, omanCoordinates.lat, omanCoordinates.lon, sphereRadius * 1.088);
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.108, 26, 26),
      new THREE.MeshBasicMaterial({
        color: 0xf4b860,
        transparent: true,
        opacity: 0.24,
        depthTest: true,
        depthWrite: false,
      }),
    );

    pulse.name = 'oman-pulse';
    pulse.position.copy(pulsePosition);

    return pulse;
  };

  const buildOmanMarker = (THREE) => {
    const markerGroup = new THREE.Group();
    const markerPosition = latLonToVector(THREE, omanCoordinates.lat, omanCoordinates.lon, sphereRadius * 1.045);
    const markerGeometry = new THREE.SphereGeometry(0.052, 18, 18);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xf4b860 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    const pinGeometry = new THREE.BufferGeometry();
    const pinStart = latLonToVector(THREE, omanCoordinates.lat, omanCoordinates.lon, sphereRadius * 1.055);
    const pinEnd = latLonToVector(THREE, omanCoordinates.lat, omanCoordinates.lon, sphereRadius * 1.34);

    marker.position.copy(markerPosition);
    pinGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      pinStart.x, pinStart.y, pinStart.z,
      pinEnd.x, pinEnd.y, pinEnd.z,
    ], 3));

    markerGroup.add(buildOmanPulse(THREE));
    markerGroup.add(marker);
    markerGroup.add(buildCountryLabel(THREE, 'OMAN', omanCoordinates.lat, omanCoordinates.lon));
    markerGroup.add(new THREE.Line(
      pinGeometry,
      new THREE.LineBasicMaterial({
        color: 0xf4b860,
        transparent: true,
        opacity: 0.72,
      }),
    ));

    return markerGroup;
  };

  const resize = () => {
    if (!renderer || !camera || !originGlobeCanvas) {
      return;
    }

    const { width, height } = originGlobeCanvas.getBoundingClientRect();
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));

    if (safeWidth === lastWidth && safeHeight === lastHeight) {
      return;
    }

    lastWidth = safeWidth;
    lastHeight = safeHeight;
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(safeWidth, safeHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  };

  const render = (timestamp = 0) => {
    if (!renderer || !scene || !camera || !globeGroup) {
      return;
    }

    const now = timestamp || performance.now();

    resize();

    if (baseQuaternion) {
      globeGroup.quaternion.copy(baseQuaternion);
    }

    if (shouldReduceDecorativeMotion()) {
      camera.position.z = cameraZoomEnd;
      globeGroup.scale.setScalar(globeScaleEnd);
    } else {
      const zoomProgress = Math.min(Math.max((now - revealStartedAt) / revealZoomDuration, 0), 1);
      const easedProgress = easeOutCubic(zoomProgress);
      camera.position.z = cameraZoomStart + ((cameraZoomEnd - cameraZoomStart) * easedProgress);
      globeGroup.scale.setScalar(globeScaleStart + ((globeScaleEnd - globeScaleStart) * easedProgress));
    }

    if (!shouldReduceDecorativeMotion()) {
      globeGroup.rotation.z += Math.sin(now * 0.0012) * 0.0009;
      const pulse = globeGroup.getObjectByName('oman-pulse');
      if (pulse) {
        const pulseScale = 1 + Math.sin(now * 0.004) * 0.16;
        pulse.scale.setScalar(pulseScale);
      }
    }

    renderer.render(scene, camera);

    if (isVisible && !shouldReduceDecorativeMotion()) {
      frameId = window.requestAnimationFrame(render);
    }
  };

  const stop = () => {
    window.cancelAnimationFrame(frameId);
    frameId = undefined;
  };

  const start = () => {
    stop();
    revealStartedAt = performance.now();
    render();

    if (isVisible && !shouldReduceDecorativeMotion()) {
      frameId = window.requestAnimationFrame(render);
    }
  };

  const init = async () => {
    if (isReady || !canUseGlobe()) {
      return isReady;
    }

    if (!hasWebGlSupport()) {
      originGlobe.classList.add('is-unavailable');
      return false;
    }

    try {
      const [THREE, topojson, worldAtlas] = await Promise.all([
        loadThree(),
        loadTopoJson(),
        loadWorldAtlas(),
      ]);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0, 4.7);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0);
      originGlobeCanvas.appendChild(renderer.domElement);

      globeGroup = new THREE.Group();
      globeGroup.add(buildGlobeShell(THREE));
      globeGroup.add(buildPointCloud(THREE));
      globeGroup.add(buildGridLines(THREE));
      globeGroup.add(buildWorldMapLayers(THREE, worldAtlas, topojson));
      globeGroup.add(buildOmanMarker(THREE));

      const omanVector = latLonToVector(THREE, omanCoordinates.lat, omanCoordinates.lon, 1).normalize();
      baseQuaternion = new THREE.Quaternion().setFromUnitVectors(omanVector, new THREE.Vector3(0, 0, 1));
      globeGroup.quaternion.copy(baseQuaternion);
      scene.add(globeGroup);

      scene.add(new THREE.AmbientLight(0x86e5e0, 1.1));
      resize();
      isReady = true;
      originGlobe.classList.remove('is-unavailable');
      return true;
    } catch {
      originGlobe.classList.add('is-unavailable');
      return false;
    }
  };

  const show = async () => {
    if (!canUseGlobe()) {
      return;
    }

    isVisible = true;
    originFigure.classList.add('is-globe-active');
    originTrigger.setAttribute('aria-expanded', 'true');

    if (await init() && isVisible) {
      start();
    }
  };

  const hide = () => {
    isVisible = false;
    stop();
    originFigure.classList.remove('is-globe-active');
    originTrigger.setAttribute('aria-expanded', 'false');
  };

  return {
    show,
    hide,
    renderStatic: () => {
      if (isVisible) {
        stop();
        render();
      }
    },
  };
};

if (originTrigger && originFigure && originGlobe) {
  const originGlobeController = createOriginGlobe();

  originTrigger.addEventListener('mouseenter', originGlobeController.show);
  originTrigger.addEventListener('focus', originGlobeController.show);

  originFigure.addEventListener('mouseleave', originGlobeController.hide);
  originTrigger.addEventListener('blur', originGlobeController.hide);

  originTrigger.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      originGlobeController.hide();
      originTrigger.blur();
    }
  });

  window.addEventListener('performance-mode-change', originGlobeController.renderStatic);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // The site remains fully usable if service worker registration is unavailable.
    });
  });
}

if (menuButton && navigation) {
  const closeMenu = () => {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  };

  menuButton.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (event) => {
    const clickedInsideMenu = navigation.contains(event.target);
    const clickedToggle = menuButton.contains(event.target);

    if (navigation.classList.contains('is-open') && !clickedInsideMenu && !clickedToggle) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
      closeMenu();
      menuButton.focus();
    }
  });

  menuButton.closest('.site-header').classList.add('menu-ready');
}

const revealItems = document.querySelectorAll('main > section:not(.hero) .reveal');
const meteor = document.querySelector('[data-meteor]');

let meteorTimer;

if (meteor) {
  const minMeteorDelay = 180000;
  const randomMeteorDelay = 90000;
  const meteorDuration = 1500;

  const randomBetween = (minimum, maximum) => Math.random() * (maximum - minimum) + minimum;

  const launchMeteor = () => {
    if (shouldReduceDecorativeMotion()) {
      return;
    }

    meteor.classList.remove('is-active');
    meteor.style.setProperty('--meteor-top', `${randomBetween(8, 48)}vh`);
    meteor.style.setProperty('--meteor-left', `${randomBetween(62, 96)}vw`);
    meteor.style.setProperty('--meteor-x', `${randomBetween(-58, -34)}vw`);
    meteor.style.setProperty('--meteor-y', `${randomBetween(24, 52)}vh`);
    meteor.style.setProperty('--meteor-angle', `${randomBetween(-34, -21)}deg`);
    meteor.style.setProperty('--meteor-length', `${randomBetween(6.5, 10.5)}rem`);
    meteor.style.setProperty('--meteor-duration', `${randomBetween(1.15, 1.75)}s`);

    window.requestAnimationFrame(() => {
      meteor.classList.add('is-active');
    });
  };

  const scheduleMeteor = () => {
    window.clearTimeout(meteorTimer);
    if (shouldReduceDecorativeMotion()) {
      return;
    }

    meteorTimer = window.setTimeout(() => {
      launchMeteor();
      scheduleMeteor();
    }, minMeteorDelay + Math.random() * randomMeteorDelay);
  };

  meteor.addEventListener('animationend', () => {
    meteor.classList.remove('is-active');
  });

  if (!shouldReduceDecorativeMotion()) {
    meteorTimer = window.setTimeout(scheduleMeteor, meteorDuration);
  }

  window.addEventListener('performance-mode-change', () => {
    window.clearTimeout(meteorTimer);
    meteor.classList.remove('is-active');
    if (!shouldReduceDecorativeMotion()) {
      scheduleMeteor();
    }
  });
}

if (!reducedMotion && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!shouldReduceDecorativeMotion()) {
            entry.target.classList.add('has-entered');
          }
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

const certificatesTrigger = document.querySelector('[data-certificates-open]');
const certificatesModal = document.querySelector('[data-certificates-modal]');

if (certificatesTrigger && certificatesModal) {
  const certificatesPanel = certificatesModal.querySelector('.certificate-modal__panel');
  const certificatesCloseButtons = certificatesModal.querySelectorAll('[data-certificates-close]');
  const modalTransitionDuration = reducedMotion ? 0 : 360;
  let closeTimer;

  const getModalFocusables = () => Array.from(
    certificatesModal.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null && element.tabIndex !== -1);

  const openCertificatesModal = () => {
    window.clearTimeout(closeTimer);
    certificatesModal.hidden = false;
    document.body.classList.add('modal-open');
    certificatesTrigger.setAttribute('aria-expanded', 'true');

    window.requestAnimationFrame(() => {
      certificatesModal.classList.add('is-open');
      certificatesPanel.focus();
    });
  };

  const closeCertificatesModal = (shouldRestoreFocus = true) => {
    if (certificatesModal.hidden) {
      return;
    }

    certificatesModal.classList.remove('is-open');
    certificatesTrigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('modal-open');

    closeTimer = window.setTimeout(() => {
      certificatesModal.hidden = true;
      if (shouldRestoreFocus) {
        certificatesTrigger.focus();
      }
    }, modalTransitionDuration);
  };

  certificatesTrigger.addEventListener('click', openCertificatesModal);
  certificatesCloseButtons.forEach((button) => {
    button.addEventListener('click', () => closeCertificatesModal());
  });

  certificatesModal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCertificatesModal();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = getModalFocusables();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });
}

if (!reducedMotion) {
  const trailLayer = document.createElement('div');
  const trailColors = [
    { color: 'rgba(244,184,96,.95)', glow: 'rgba(244,184,96,.42)' },
    { color: 'rgba(134,229,224,.88)', glow: 'rgba(134,229,224,.32)' },
    { color: 'rgba(238,244,241,.72)', glow: 'rgba(238,244,241,.24)' },
  ];
  const maxTrailParticles = 80;
  const activeTrailParticles = new Set();

  trailLayer.className = 'click-trail-layer';
  trailLayer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(trailLayer);

  const trimTrailParticles = () => {
    while (activeTrailParticles.size > maxTrailParticles) {
      const oldestParticle = activeTrailParticles.values().next().value;
      activeTrailParticles.delete(oldestParticle);
      oldestParticle.remove();
    }
  };

  const clearTrailParticles = () => {
    activeTrailParticles.forEach((particle) => particle.remove());
    activeTrailParticles.clear();
  };

  const createTrailParticle = (x, y, index) => {
    const particle = document.createElement('span');
    const palette = trailColors[index % trailColors.length];
    const driftX = (Math.random() - .5) * 56;
    const driftY = 18 + Math.random() * 58;
    const size = 5 + Math.random() * 8;
    const duration = 560 + Math.random() * 320;

    particle.className = 'click-trail-particle';
    particle.style.setProperty('--origin-x', `${x}px`);
    particle.style.setProperty('--origin-y', `${y}px`);
    particle.style.setProperty('--trail-x', `${driftX}px`);
    particle.style.setProperty('--trail-y', `${driftY}px`);
    particle.style.setProperty('--trail-size', `${size}px`);
    particle.style.setProperty('--trail-duration', `${duration}ms`);
    particle.style.setProperty('--trail-color', palette.color);
    particle.style.setProperty('--trail-glow', palette.glow);

    particle.addEventListener('animationend', () => {
      activeTrailParticles.delete(particle);
      particle.remove();
    }, { once: true });

    activeTrailParticles.add(particle);
    trailLayer.appendChild(particle);
  };

  document.addEventListener('pointerdown', (event) => {
    if (shouldReduceDecorativeMotion()) {
      clearTrailParticles();
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    for (let index = 0; index < 8; index += 1) {
      createTrailParticle(event.clientX, event.clientY, index);
    }

    trimTrailParticles();
  }, { passive: true });

  window.addEventListener('performance-mode-change', () => {
    if (shouldReduceDecorativeMotion()) {
      clearTrailParticles();
    }
  });
}
