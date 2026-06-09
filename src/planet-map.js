import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.min.js";

const stage = document.querySelector("#three-planet-stage");
const PLANET_RADIUS = 4;
const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;
const LAND_REGIONS = [
  { color: "#ffd2aa", x: 330, y: 310, radiusX: 240, radiusY: 150, rotation: -0.16 },
  { color: "#bde6a2", x: 930, y: 306, radiusX: 260, radiusY: 160, rotation: 0.18 },
  { color: "#f8b7d7", x: 1540, y: 330, radiusX: 280, radiusY: 168, rotation: -0.1 },
  { color: "#a7e2cd", x: 410, y: 720, radiusX: 260, radiusY: 145, rotation: 0.12 },
  { color: "#dfc3ff", x: 1220, y: 740, radiusX: 245, radiusY: 150, rotation: -0.24 },
  { color: "#ffe4a6", x: 1810, y: 780, radiusX: 175, radiusY: 104, rotation: 0.28 },
];

if (stage) {
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

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  stage.replaceChildren(renderer.domElement);
  renderer.domElement.className = "three-planet-canvas";
  renderer.domElement.setAttribute("aria-label", "可以拖动旋转的三维鼠鼠星球");

  camera.position.set(0, 0.28, 14.6);
  scene.add(camera);
  scene.add(planetGroup);

  const starField = createStarField();
  scene.add(starField);

  const fairyTexture = createShushuPlanetTexture();

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS, 96, 96),
    new THREE.MeshLambertMaterial({
      map: fairyTexture,
    }),
  );
  planetGroup.add(planet);

  const colorWash = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS + 0.012, 96, 96),
    new THREE.MeshBasicMaterial({
      map: createFairyGlowTexture(),
      transparent: true,
      opacity: 0.12,
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

  const keyLight = new THREE.DirectionalLight("#fff4e8", 1.15);
  keyLight.position.set(8, 7, 8);
  scene.add(keyLight);

  const pinkLight = new THREE.PointLight("#ff9ec1", 0.38, 40);
  pinkLight.position.set(-7, 4, 5);
  scene.add(pinkLight);

  const blueLight = new THREE.PointLight("#85d8ff", 0.32, 40);
  blueLight.position.set(6, -4, 6);
  scene.add(blueLight);

  scene.add(new THREE.AmbientLight("#7f91a8", 0.42));

  function resize() {
    const rect = stage.getBoundingClientRect();
    const size = Math.max(320, Math.min(rect.width, rect.height || rect.width));
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    renderFrame();
  }

  function animate() {
    frameId = requestAnimationFrame(animate);
    if (!pointerState.active) {
      planet.rotation.y += 0.0018;
      landLayer.rotation.y += 0.0018;
      colorWash.rotation.y += 0.0018;
      clouds.rotation.y += 0.0028;
      starField.rotation.y += 0.00024;
    }
    updateSelectableLands(selectableLands, hoveredLand);
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
    renderer.domElement.setPointerCapture?.(event.pointerId);
    renderer.domElement.classList.add("dragging");
  }

  function onPointerMove(event) {
    if (pointerState.active) {
      const deltaX = event.clientX - pointerState.x;
      const deltaY = event.clientY - pointerState.y;
      planetGroup.rotation.y = pointerState.rotationY + deltaX * 0.006;
      planetGroup.rotation.x = Math.max(-0.62, Math.min(0.62, pointerState.rotationX + deltaY * 0.004));
    }
    updateHoveredLand(event);
  }

  function onPointerUp(event) {
    pointerState.active = false;
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    renderer.domElement.classList.remove("dragging");
    renderer.domElement.style.cursor = hoveredLand ? "pointer" : "grab";
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
    hoveredLand = hits.length ? hits[0].object.userData.land : null;
    renderer.domElement.style.cursor = pointerState.active ? "grabbing" : hoveredLand ? "pointer" : "grab";
  }

  function clearHoveredLand() {
    hoveredLand = null;
    renderer.domElement.style.cursor = "grab";
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
    renderer.dispose();
  });
}

function createShushuPlanetTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const context = canvas.getContext("2d");
  const ocean = context.createLinearGradient(0, 0, canvas.width, canvas.height);

  ocean.addColorStop(0, "#ffd1e5");
  ocean.addColorStop(0.22, "#a9e7f3");
  ocean.addColorStop(0.48, "#7cc7ec");
  ocean.addColorStop(0.72, "#b4a4ef");
  ocean.addColorStop(1, "#ffe0bd");
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

    surface.userData.land = { group, surface, outline };
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
  const radius = THREE.MathUtils.lerp(geometry.userData.baseRadius, geometry.userData.hoverRadius, lift);

  for (let i = 0; i < position.count; i += 1) {
    const normal = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i)).normalize();
    position.setXYZ(i, normal.x * radius, normal.y * radius, normal.z * radius);
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
