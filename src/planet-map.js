import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.min.js";

const PLANET_RADIUS = 4;
const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;
const LAND_REGIONS = [
  { name: "月光谷", color: "#f0c090", x: 330, y: 310, radiusX: 240, radiusY: 150, rotation: -0.16 },
  { name: "瓜子环", color: "#a3d680", x: 930, y: 306, radiusX: 260, radiusY: 160, rotation: 0.18 },
  { name: "棉花云", color: "#f2a0cc", x: 1540, y: 330, radiusX: 280, radiusY: 168, rotation: -0.1 },
  { name: "星砂海", color: "#86d4b8", x: 410, y: 720, radiusX: 260, radiusY: 145, rotation: 0.12 },
  { name: "蜜糖丘", color: "#d0a8f8", x: 1220, y: 740, radiusX: 245, radiusY: 150, rotation: -0.24 },
  { name: "软绒原", color: "#f5d478", x: 1810, y: 780, radiusX: 175, radiusY: 104, rotation: 0.28 },
];
const EARTH_LANDS = [
  { x: 360, y: 300, radiusX: 210, radiusY: 130, rotation: -0.18, color: "#7fbf7a" },
  { x: 620, y: 430, radiusX: 150, radiusY: 92, rotation: 0.22, color: "#8ecf88" },
  { x: 1080, y: 280, radiusX: 280, radiusY: 150, rotation: 0.08, color: "#6fb36d" },
  { x: 1480, y: 360, radiusX: 190, radiusY: 110, rotation: -0.12, color: "#86c97f" },
  { x: 1760, y: 520, radiusX: 150, radiusY: 88, rotation: 0.3, color: "#97d48c" },
  { x: 430, y: 720, radiusX: 240, radiusY: 120, rotation: 0.16, color: "#74b978" },
  { x: 980, y: 760, radiusX: 170, radiusY: 90, rotation: -0.2, color: "#8dca82" },
  { x: 1540, y: 780, radiusX: 210, radiusY: 108, rotation: 0.1, color: "#6eae6c" },
];

mountStarPlanet(document.querySelector("#three-planet-stage"));
mountEarthPlanet(document.querySelector("#three-earth-stage"));

function mountStarPlanet(stage) {
  if (!stage) return;

  const fallback = stage.querySelector(".three-planet-fallback");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const planetGroup = new THREE.Group();
  const landLayer = new THREE.Group();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointerState = {
    active: false,
    x: 0,
    y: 0,
    rotationX: 0,
    rotationY: 0,
  };

  let frameId = null;
  let hoveredLand = null;
  let prevHoveredLand = null;
  let animPaused = false;
  let needsRender = true;
  let pointerDownX = 0;
  let pointerDownY = 0;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  stage.replaceChildren(renderer.domElement);
  renderer.domElement.className = "three-planet-canvas";
  renderer.domElement.setAttribute("aria-label", "可以拖动旋转的三维鼠鼠星球");

  const tooltip = document.createElement("div");
  tooltip.className = "planet-tooltip";
  tooltip.setAttribute("aria-hidden", "true");
  tooltip.style.display = "none";
  stage.appendChild(tooltip);

  function showTooltip(land, clientX, clientY) {
    const stageRect = stage.getBoundingClientRect();
    tooltip.textContent = land.region;
    tooltip.style.display = "block";
    tooltip.style.left = `${clientX - stageRect.left}px`;
    tooltip.style.top = `${clientY - stageRect.top - 18}px`;
    tooltip.style.transform = "translate(-50%, -100%)";
  }

  function hideTooltip() {
    tooltip.style.display = "none";
    tooltip.style.transform = "none";
  }

  camera.position.set(0, 0.28, 14.6);
  scene.add(camera);
  scene.add(planetGroup);

  const starField = createStarField();
  const starGroup = new THREE.Group();
  starGroup.add(starField);
  scene.add(starGroup);

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS, 96, 96),
    new THREE.MeshLambertMaterial({
      map: createShushuPlanetTexture(),
    }),
  );
  planetGroup.add(planet);

  const colorWash = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS + 0.012, 96, 96),
    new THREE.MeshBasicMaterial({
      map: createFairyGlowTexture(),
      transparent: true,
      opacity: 0.06,
    }),
  );
  planetGroup.add(colorWash);
  if (fallback) fallback.textContent = "";

  const selectableLands = createSelectableLands();
  selectableLands.forEach((land) => landLayer.add(land.group));
  planetGroup.add(landLayer);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS + 0.08, 96, 96),
    new THREE.MeshLambertMaterial({
      map: createCloudTexture(),
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  );
  planetGroup.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS + 0.22, 96, 96),
    new THREE.MeshBasicMaterial({
      color: "#9adff2",
      transparent: true,
      opacity: 0.055,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  planetGroup.add(atmosphere);

  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS + 0.28, 96, 96),
    new THREE.MeshBasicMaterial({
      color: "#ffd7e6",
      transparent: true,
      opacity: 0.035,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  planetGroup.add(rim);

  addPlanetLights(scene);

  function resize() {
    const rect = stage.getBoundingClientRect();
    const size = Math.max(280, Math.min(rect.width, rect.height || rect.width));
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    renderFrame();
  }

  function animate() {
    frameId = requestAnimationFrame(animate);

    if (animPaused) {
      if (!needsRender) return;
      needsRender = false;
      renderer.render(scene, camera);
      return;
    }

    if (!pointerState.active) {
      planetGroup.rotation.y += 0.0018;
      clouds.rotation.y += 0.0010;
      starGroup.rotation.y += 0.00024;
    }

    if (hoveredLand !== prevHoveredLand) {
      prevHoveredLand = hoveredLand;
      updateSelectableLands(selectableLands, hoveredLand);
    } else {
      const anyAnimating = selectableLands.some((land) => {
        const lift = land.group.userData.lift ?? 0;
        const target = land === hoveredLand ? 1 : 0;
        return Math.abs(lift - target) > 0.002;
      });
      if (anyAnimating) {
        updateSelectableLands(selectableLands, hoveredLand);
      }
    }

    renderer.render(scene, camera);
  }

  function renderFrame() {
    renderer.render(scene, camera);
  }

  function onPointerDown(event) {
    pointerState.active = true;
    pointerState.x = event.clientX;
    pointerState.y = event.clientY;
    pointerState.rotationX = planetGroup.rotation.x;
    pointerState.rotationY = planetGroup.rotation.y;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    hideTooltip();
    renderer.domElement.setPointerCapture?.(event.pointerId);
    renderer.domElement.classList.add("dragging");
  }

  function onPointerMove(event) {
    if (pointerState.active) {
      const deltaX = event.clientX - pointerState.x;
      const deltaY = event.clientY - pointerState.y;
      planetGroup.rotation.y = pointerState.rotationY + deltaX * 0.006;
      planetGroup.rotation.x = Math.max(-0.62, Math.min(0.62, pointerState.rotationX + deltaY * 0.004));
    } else {
      updateHoveredLand(event);
    }
  }

  function onPointerUp(event) {
    const dx = event.clientX - pointerDownX;
    const dy = event.clientY - pointerDownY;
    const wasDrag = Math.sqrt(dx * dx + dy * dy) > 5;

    pointerState.active = false;
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    renderer.domElement.classList.remove("dragging");
    renderer.domElement.style.cursor = hoveredLand ? "pointer" : "grab";

    if (!wasDrag && hoveredLand) {
      stage.dispatchEvent(
        new CustomEvent("planet:region-click", {
          bubbles: true,
          detail: { presence: "star", region: hoveredLand.region },
        }),
      );
    }
  }

  function updateHoveredLand(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(
      selectableLands.map((land) => land.surface),
      false,
    );
    const newHovered = hits.length ? hits[0].object.userData.land : null;
    if (newHovered !== hoveredLand) {
      hoveredLand = newHovered;
      if (hoveredLand) {
        showTooltip(hoveredLand, event.clientX, event.clientY);
        stage.dispatchEvent(
          new CustomEvent("planet:region-hover", {
            bubbles: true,
            detail: { presence: "star", region: hoveredLand.region },
          }),
        );
      } else {
        hideTooltip();
        stage.dispatchEvent(
          new CustomEvent("planet:region-hover", {
            bubbles: true,
            detail: { presence: "star", region: null },
          }),
        );
      }
    } else if (hoveredLand && !pointerState.active) {
      showTooltip(hoveredLand, event.clientX, event.clientY);
    }
    renderer.domElement.style.cursor = pointerState.active ? "grabbing" : hoveredLand ? "pointer" : "grab";
  }

  function clearHoveredLand() {
    hoveredLand = null;
    hideTooltip();
    renderer.domElement.style.cursor = "grab";
  }

  function onVisibilityChange() {
    if (document.hidden) {
      animPaused = true;
    } else {
      animPaused = false;
      needsRender = true;
    }
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  if (window.IntersectionObserver) {
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        animPaused = !entries[0].isIntersecting;
        if (!animPaused) needsRender = true;
      },
      { threshold: 0 },
    );
    visibilityObserver.observe(stage);
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", (event) => {
    onPointerUp(event);
    clearHoveredLand();
  });
  window.addEventListener("resize", resize);

  resize();
  animate();

  window.addEventListener("pagehide", () => {
    if (frameId) cancelAnimationFrame(frameId);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    renderer.dispose();
  });
}

function mountEarthPlanet(stage) {
  if (!stage) return;

  const fallback = stage.querySelector(".three-planet-fallback");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const planetGroup = new THREE.Group();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointerState = {
    active: false,
    x: 0,
    y: 0,
    rotationX: 0,
    rotationY: 0,
  };

  let frameId = null;
  let hoveredEarth = false;
  let animPaused = false;
  let needsRender = true;
  let pointerDownX = 0;
  let pointerDownY = 0;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  stage.replaceChildren(renderer.domElement);
  renderer.domElement.className = "three-planet-canvas";
  renderer.domElement.setAttribute("aria-label", "可以拖动旋转的三维地球");

  const tooltip = document.createElement("div");
  tooltip.className = "planet-tooltip";
  tooltip.setAttribute("aria-hidden", "true");
  tooltip.style.display = "none";
  stage.appendChild(tooltip);

  function showTooltip(clientX, clientY) {
    const stageRect = stage.getBoundingClientRect();
    tooltip.textContent = "地球";
    tooltip.style.display = "block";
    tooltip.style.left = `${clientX - stageRect.left}px`;
    tooltip.style.top = `${clientY - stageRect.top - 18}px`;
    tooltip.style.transform = "translate(-50%, -100%)";
  }

  function hideTooltip() {
    tooltip.style.display = "none";
    tooltip.style.transform = "none";
  }

  camera.position.set(0, 0.28, 14.6);
  scene.add(camera);
  scene.add(planetGroup);

  const starField = createStarField();
  const starGroup = new THREE.Group();
  starGroup.add(starField);
  scene.add(starGroup);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS, 96, 96),
    new THREE.MeshLambertMaterial({
      map: createEarthTexture(),
    }),
  );
  planetGroup.add(earth);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS + 0.08, 96, 96),
    new THREE.MeshLambertMaterial({
      map: createCloudTexture(),
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  planetGroup.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS + 0.24, 96, 96),
    new THREE.MeshBasicMaterial({
      color: "#7ec8ff",
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  planetGroup.add(atmosphere);

  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS + 0.32, 96, 96),
    new THREE.MeshBasicMaterial({
      color: "#cfe8ff",
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  planetGroup.add(rim);
  if (fallback) fallback.textContent = "";

  addPlanetLights(scene, {
    key: "#fff6e8",
    pink: "#9ad7ff",
    blue: "#7ec8ff",
  });

  function resize() {
    const rect = stage.getBoundingClientRect();
    const size = Math.max(280, Math.min(rect.width, rect.height || rect.width));
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    renderFrame();
  }

  function animate() {
    frameId = requestAnimationFrame(animate);

    if (animPaused) {
      if (!needsRender) return;
      needsRender = false;
      renderer.render(scene, camera);
      return;
    }

    if (!pointerState.active) {
      planetGroup.rotation.y += 0.0015;
      clouds.rotation.y += 0.0009;
      starGroup.rotation.y += 0.00024;
    }

    renderer.render(scene, camera);
  }

  function renderFrame() {
    renderer.render(scene, camera);
  }

  function onPointerDown(event) {
    pointerState.active = true;
    pointerState.x = event.clientX;
    pointerState.y = event.clientY;
    pointerState.rotationX = planetGroup.rotation.x;
    pointerState.rotationY = planetGroup.rotation.y;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    hideTooltip();
    renderer.domElement.setPointerCapture?.(event.pointerId);
    renderer.domElement.classList.add("dragging");
  }

  function onPointerMove(event) {
    if (pointerState.active) {
      const deltaX = event.clientX - pointerState.x;
      const deltaY = event.clientY - pointerState.y;
      planetGroup.rotation.y = pointerState.rotationY + deltaX * 0.006;
      planetGroup.rotation.x = Math.max(-0.62, Math.min(0.62, pointerState.rotationX + deltaY * 0.004));
    } else {
      updateHoveredEarth(event);
    }
  }

  function onPointerUp(event) {
    const dx = event.clientX - pointerDownX;
    const dy = event.clientY - pointerDownY;
    const wasDrag = Math.sqrt(dx * dx + dy * dy) > 5;

    pointerState.active = false;
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    renderer.domElement.classList.remove("dragging");
    renderer.domElement.style.cursor = hoveredEarth ? "pointer" : "grab";

    if (!wasDrag && hoveredEarth) {
      stage.dispatchEvent(
        new CustomEvent("planet:region-click", {
          bubbles: true,
          detail: { presence: "earth", region: null },
        }),
      );
    }
  }

  function updateHoveredEarth(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObject(earth, false);
    const nextHovered = hits.length > 0;
    if (nextHovered !== hoveredEarth) {
      hoveredEarth = nextHovered;
      if (hoveredEarth) {
        showTooltip(event.clientX, event.clientY);
        stage.dispatchEvent(
          new CustomEvent("planet:region-hover", {
            bubbles: true,
            detail: { presence: "earth", region: null },
          }),
        );
      } else {
        hideTooltip();
        stage.dispatchEvent(
          new CustomEvent("planet:region-hover", {
            bubbles: true,
            detail: { presence: null, region: null },
          }),
        );
      }
    } else if (hoveredEarth && !pointerState.active) {
      showTooltip(event.clientX, event.clientY);
    }
    renderer.domElement.style.cursor = pointerState.active ? "grabbing" : hoveredEarth ? "pointer" : "grab";
  }

  function clearHoveredEarth() {
    hoveredEarth = false;
    hideTooltip();
    renderer.domElement.style.cursor = "grab";
  }

  function onVisibilityChange() {
    if (document.hidden) {
      animPaused = true;
    } else {
      animPaused = false;
      needsRender = true;
    }
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  if (window.IntersectionObserver) {
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        animPaused = !entries[0].isIntersecting;
        if (!animPaused) needsRender = true;
      },
      { threshold: 0 },
    );
    visibilityObserver.observe(stage);
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", (event) => {
    onPointerUp(event);
    clearHoveredEarth();
  });
  window.addEventListener("resize", resize);

  resize();
  animate();

  window.addEventListener("pagehide", () => {
    if (frameId) cancelAnimationFrame(frameId);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    renderer.dispose();
  });
}

function addPlanetLights(scene, colors = {}) {
  const keyLight = new THREE.DirectionalLight(colors.key || "#fff8ed", 0.72);
  keyLight.position.set(8, 7, 8);
  scene.add(keyLight);

  const pinkLight = new THREE.PointLight(colors.pink || "#ff9ec1", 0.24, 40);
  pinkLight.position.set(-7, 4, 5);
  scene.add(pinkLight);

  const blueLight = new THREE.PointLight(colors.blue || "#85d8ff", 0.20, 40);
  blueLight.position.set(6, -4, 6);
  scene.add(blueLight);

  scene.add(new THREE.AmbientLight("#8899aa", 0.26));
}

function createShushuPlanetTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const context = canvas.getContext("2d");
  const ocean = context.createLinearGradient(0, 0, canvas.width, canvas.height);

  ocean.addColorStop(0, "#e8c4d8");
  ocean.addColorStop(0.22, "#8ecfdf");
  ocean.addColorStop(0.48, "#5eaad4");
  ocean.addColorStop(0.72, "#9888d8");
  ocean.addColorStop(1, "#e8c8a0");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  LAND_REGIONS.forEach((region) => {
    drawFairyLand(context, region);
  });

  drawCandyIslands(context);
  drawSoftTextureSpeckles(context);
  drawPastelBands(context);

  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const context = canvas.getContext("2d");
  const ocean = context.createLinearGradient(0, 0, canvas.width, canvas.height);

  ocean.addColorStop(0, "#8ec8e8");
  ocean.addColorStop(0.28, "#4f9fd4");
  ocean.addColorStop(0.58, "#3b86c4");
  ocean.addColorStop(0.82, "#2f6eaa");
  ocean.addColorStop(1, "#3d7fb8");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  EARTH_LANDS.forEach((land) => {
    drawFairyLand(context, land);
  });

  drawSoftTextureSpeckles(context);

  context.save();
  context.globalAlpha = 0.18;
  context.fillStyle = "#ffffff";
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 311) % canvas.width;
    const y = 70 + ((i * 97) % 180);
    context.beginPath();
    context.ellipse(x, y, 90 + (i % 4) * 18, 16 + (i % 3) * 6, 0.2, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createFairyGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const context = canvas.getContext("2d");
  const glow = context.createLinearGradient(0, 0, canvas.width, 0);

  glow.addColorStop(0, "rgba(255, 196, 226, 0.26)");
  glow.addColorStop(0.32, "rgba(255, 255, 255, 0.1)");
  glow.addColorStop(0.52, "rgba(135, 224, 244, 0.22)");
  glow.addColorStop(0.82, "rgba(255, 224, 164, 0.18)");
  glow.addColorStop(1, "rgba(255, 196, 226, 0.26)");
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255, 255, 255, 0.72)";
  for (let i = 0; i < 34; i += 1) {
    const x = (i * 271) % canvas.width;
    const y = 80 + ((i * 127) % 840);
    context.beginPath();
    context.ellipse(x, y, 150 + (i % 5) * 30, 18 + (i % 4) * 8, (i % 7) * 0.22, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createStarField() {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  for (let i = 0; i < 900; i += 1) {
    const radius = 28 + Math.random() * 38;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    vertices.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    );
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: "#ffffff",
      size: 0.035,
      transparent: true,
      opacity: 0.76,
    }),
  );
}

function createSelectableLands() {
  return LAND_REGIONS.map((region) => {
    const group = new THREE.Group();
    const points = createLandBoundaryPoints(region);
    const surface = createSphericalLandMesh(points, region.color);
    const outline = createSphericalLandOutline(points);

    surface.userData.land = { group, surface, outline, region: region.name, tx: region.x, ty: region.y };
    group.add(surface);
    group.add(outline);

    return surface.userData.land;
  });
}

function createLandBoundaryPoints(region, segments = 72) {
  const points = [];

  for (let i = 0; i < segments; i += 1) {
    const progress = i / segments;
    const angle = Math.PI * 2 * progress;
    const wobble = 0.86 + 0.12 * Math.sin(progress * Math.PI * 30.6) + 0.08 * Math.cos(progress * Math.PI * 41.4);
    const localX = Math.cos(angle) * region.radiusX * wobble;
    const localY = Math.sin(angle) * region.radiusY * (0.9 + 0.1 * Math.cos(progress * Math.PI * 23.4));
    const rotatedX = localX * Math.cos(region.rotation) - localY * Math.sin(region.rotation);
    const rotatedY = localX * Math.sin(region.rotation) + localY * Math.cos(region.rotation);

    points.push({
      x: region.x + rotatedX,
      y: region.y + rotatedY,
    });
  }

  return points;
}

function createSphericalLandMesh(points, color) {
  const center = getWrappedCenter(points);
  const ringCount = 14;
  const baseRadius = PLANET_RADIUS + 0.028;
  const vertices = [];
  const indices = [];

  for (let ring = 0; ring <= ringCount; ring += 1) {
    const t = ring / ringCount;

    points.forEach((point) => {
      vertices.push(
        texturePointToSphere(
          THREE.MathUtils.lerp(center.x, point.x, t),
          THREE.MathUtils.lerp(center.y, point.y, t),
          baseRadius,
        ),
      );
    });
  }

  for (let ring = 0; ring < ringCount; ring += 1) {
    const currentRing = ring * points.length;
    const nextRing = (ring + 1) * points.length;

    for (let i = 0; i < points.length; i += 1) {
      const next = (i + 1) % points.length;

      indices.push(currentRing + i, nextRing + i, nextRing + next);
      indices.push(currentRing + i, nextRing + next, currentRing + next);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setFromPoints(vertices);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Pre-cache normalized direction vectors for each vertex (used in updateLandSurfaceLift)
  const posAttr = geometry.getAttribute("position");
  const normals = new Float32Array(posAttr.count * 3);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i += 1) {
    tmp.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).normalize();
    normals[i * 3] = tmp.x;
    normals[i * 3 + 1] = tmp.y;
    normals[i * 3 + 2] = tmp.z;
  }
  geometry.userData.normals = normals;
  geometry.userData.baseRadius = baseRadius;
  geometry.userData.hoverRadius = PLANET_RADIUS + 0.18;

  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
}

function createSphericalLandOutline(points) {
  const curvePoints = points.map((point) => texturePointToSphere(point.x, point.y, PLANET_RADIUS + 0.052));
  curvePoints.push(curvePoints[0].clone());

  const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
  geometry.userData.points = points;
  geometry.userData.baseRadius = PLANET_RADIUS + 0.052;
  geometry.userData.hoverRadius = PLANET_RADIUS + 0.202;

  return new THREE.LineLoop(
    geometry,
    new THREE.LineBasicMaterial({
      color: "#fff8e8",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      linewidth: 2,
    }),
  );
}

function updateSelectableLands(lands, activeLand) {
  lands.forEach((land) => {
    const isActive = land === activeLand;
    const targetLift = isActive ? 1 : 0;
    const currentLift = land.group.userData.lift ?? 0;
    const nextLift = THREE.MathUtils.lerp(currentLift, targetLift, 0.18);
    const targetOpacity = isActive ? 0.94 : 0;
    const targetOutlineOpacity = isActive ? 0.95 : 0;

    land.group.userData.lift = nextLift;
    updateLandSurfaceLift(land.surface.geometry, nextLift);
    updateLandOutlineLift(land.outline.geometry, nextLift);
    land.surface.material.opacity += (targetOpacity - land.surface.material.opacity) * 0.18;
    land.outline.material.opacity += (targetOutlineOpacity - land.outline.material.opacity) * 0.22;
  });
}

function updateLandSurfaceLift(geometry, lift) {
  const position = geometry.getAttribute("position");
  const normals = geometry.userData.normals;
  if (!normals) return;
  const radius = THREE.MathUtils.lerp(geometry.userData.baseRadius, geometry.userData.hoverRadius, lift);

  for (let i = 0; i < position.count; i += 1) {
    const i3 = i * 3;
    position.setXYZ(i, normals[i3] * radius, normals[i3 + 1] * radius, normals[i3 + 2] * radius);
  }

  position.needsUpdate = true;
}

function updateLandOutlineLift(geometry, lift) {
  const points = geometry.userData.points;
  const radius = THREE.MathUtils.lerp(geometry.userData.baseRadius, geometry.userData.hoverRadius, lift);
  const curvePoints = points.map((point) => texturePointToSphere(point.x, point.y, radius));
  curvePoints.push(curvePoints[0].clone());
  geometry.setFromPoints(curvePoints);
}

function texturePointToSphere(x, y, radius) {
  const u = THREE.MathUtils.euclideanModulo(x, TEXTURE_WIDTH) / TEXTURE_WIDTH;
  const v = y / TEXTURE_HEIGHT;
  const lon = u * Math.PI * 2;
  const lat = Math.PI / 2 - v * Math.PI;
  const cosLat = Math.cos(lat);

  return new THREE.Vector3(
    -radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lon),
  );
}

function getWrappedCenter(points) {
  let sumX = 0;
  let sumY = 0;

  points.forEach((point) => {
    sumX += point.x;
    sumY += point.y;
  });

  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

function drawFairyLand(context, region) {
  const points = createLandBoundaryPoints(region);

  context.save();
  context.fillStyle = region.color;
  context.strokeStyle = "rgba(255, 255, 255, 0.42)";
  context.lineWidth = 10;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.fill();
  context.stroke();

  context.globalAlpha = 0.22;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.ellipse(
    region.x - region.radiusX * 0.22 * Math.cos(region.rotation) + region.radiusY * 0.24 * Math.sin(region.rotation),
    region.y - region.radiusX * 0.22 * Math.sin(region.rotation) - region.radiusY * 0.24 * Math.cos(region.rotation),
    region.radiusX * 0.36,
    region.radiusY * 0.18,
    region.rotation - 0.24,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.globalAlpha = 1;
  context.restore();
}

function drawCandyIslands(context) {
  const islands = [
    [690, 180, 54, 32, "#fff0a8"],
    [1320, 188, 48, 30, "#bcebdc"],
    [1880, 474, 68, 38, "#ffc7dc"],
    [820, 824, 56, 34, "#f7c0ff"],
    [1660, 646, 44, 26, "#c7f0a7"],
    [92, 616, 46, 28, "#ffe0b4"],
  ];

  islands.forEach(([x, y, rx, ry, color], index) => {
    context.save();
    context.translate(x, y);
    context.rotate(index * 0.24);
    context.fillStyle = color;
    context.strokeStyle = "rgba(255, 255, 255, 0.48)";
    context.lineWidth = 5;
    context.beginPath();
    context.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  });
}

function drawSoftTextureSpeckles(context) {
  context.save();
  context.globalAlpha = 0.18;
  for (let i = 0; i < 160; i += 1) {
    const x = (i * 137) % 2048;
    const y = (i * 251) % 1024;
    const radius = 4 + (i % 5);
    context.fillStyle = i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#ffe0ef" : "#c7f3ff";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawPastelBands(context) {
  context.save();
  context.globalAlpha = 0.16;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 28;
  for (let i = 0; i < 5; i += 1) {
    context.beginPath();
    context.ellipse(360 + i * 420, 250 + (i % 2) * 260, 260, 46, -0.16 + i * 0.12, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}
