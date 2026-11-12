import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* =========================================================
   3D ENGINEERING LAB
   - Truyền động bánh răng
   - Truyền động đai
   - Truyền động xích
   - Tay quay - con trượt
   ========================================================= */

const canvasContainer = document.getElementById("engineering-canvas");
const loadingElement = document.getElementById("viewer-loading");
const errorElement = document.getElementById("viewer-error");

const modelButtons = document.querySelectorAll(".model-option");
const speedControl = document.getElementById("speed-control");
const speedValue = document.getElementById("speed-value");
const specificControls = document.getElementById("specific-controls");

const motionButton = document.getElementById("toggle-motion");
const motionText = document.getElementById("motion-text");
const motionIcon = document.getElementById("motion-icon");
const resetCameraButton = document.getElementById("reset-camera");
const labelsButton = document.getElementById("toggle-labels");
const labelsText = document.getElementById("labels-text");

const viewerTitle = document.getElementById("viewer-title");
const modelTypeLabel = document.getElementById("model-type-label");

const principleElement = document.getElementById("model-principle");
const componentsElement = document.getElementById("model-components");
const characteristicElement = document.getElementById("model-characteristic");

const resultModel = document.getElementById("result-model");
const resultDriver = document.getElementById("result-driver");
const resultDriven = document.getElementById("result-driven");
const resultRatio = document.getElementById("result-ratio");
const resultNote = document.getElementById("result-note");

const retryButton = document.getElementById("retry-viewer");

const MODEL_INFO = {
  gear: {
    title: "Truyền động bánh răng",
    type: "GEAR TRANSMISSION",
    principle:
      "Hai bánh răng có các răng ăn khớp với nhau. Khi bánh dẫn quay, bánh bị dẫn quay theo chiều ngược lại. Tốc độ quay phụ thuộc vào số răng của hai bánh.",
    components: ["Bánh dẫn", "Bánh bị dẫn", "Trục quay", "Các răng ăn khớp"],
    characteristic:
      "Hai bánh răng ngoài quay ngược chiều nhau. Bánh có nhiều răng hơn sẽ quay chậm hơn.",
    note: "Tỉ số truyền i = n₁/n₂ = z₂/z₁. Mô hình sử dụng số răng làm thông số đại diện.",
  },

  belt: {
    title: "Truyền động đai",
    type: "BELT TRANSMISSION",
    principle:
      "Dây đai nối hai bánh đai. Khi bánh dẫn quay, lực ma sát giữa dây đai và bánh đai làm bánh bị dẫn quay theo.",
    components: ["Bánh đai dẫn", "Bánh đai bị dẫn", "Dây đai", "Trục quay"],
    characteristic:
      "Với bộ truyền đai không bắt chéo, hai bánh đai quay cùng chiều. Tốc độ quay phụ thuộc vào đường kính bánh đai.",
    note: "Bỏ qua trượt, tỉ số truyền i = n₁/n₂ = D₂/D₁.",
  },

  chain: {
    title: "Truyền động xích",
    type: "CHAIN TRANSMISSION",
    principle:
      "Xích ăn khớp với các răng của đĩa xích. Khi đĩa xích dẫn quay, xích kéo đĩa xích bị dẫn chuyển động.",
    components: ["Đĩa xích dẫn", "Đĩa xích bị dẫn", "Dây xích", "Trục quay"],
    characteristic:
      "Hai đĩa xích quay cùng chiều khi xích không bắt chéo. Bộ truyền xích hạn chế hiện tượng trượt.",
    note: "Tỉ số truyền i = n₁/n₂ = z₂/z₁.",
  },

  crank: {
    title: "Tay quay – con trượt",
    type: "CRANK-SLIDER MECHANISM",
    principle:
      "Cơ cấu tay quay – con trượt biến chuyển động quay của tay quay thành chuyển động tịnh tiến qua lại của con trượt.",
    components: ["Tay quay", "Thanh truyền", "Con trượt", "Giá dẫn hướng"],
    characteristic:
      "Tay quay chuyển động tròn, còn con trượt chuyển động qua lại trên một đường thẳng.",
    note: "Hành trình lý thuyết của con trượt bằng hai lần bán kính tay quay trong cơ cấu này.",
  },
};

let scene;
let camera;
let renderer;
let orbitControls;
let animationFrameId = null;

let currentModel = "gear";
let currentGroup = null;
let currentObjects = {};
let currentLabels = [];

let isPaused = false;
let showLabels = false;
let speedMultiplier = 1;
let elapsedTime = 0;
let previousTime = 0;

let parameters = {
  gearDriverTeeth: 20,
  gearDrivenTeeth: 30,
  beltDriverDiameter: 2.2,
  beltDrivenDiameter: 3.2,
  chainDriverTeeth: 18,
  chainDrivenTeeth: 30,
  crankRadius: 1.1,
};

const MATERIALS = {
  blue: new THREE.MeshStandardMaterial({
    color: 0x3979c9,
    metalness: 0.35,
    roughness: 0.38,
  }),

  orange: new THREE.MeshStandardMaterial({
    color: 0xe9a23b,
    metalness: 0.3,
    roughness: 0.42,
  }),

  dark: new THREE.MeshStandardMaterial({
    color: 0x33445c,
    metalness: 0.55,
    roughness: 0.4,
  }),

  silver: new THREE.MeshStandardMaterial({
    color: 0xaab8c9,
    metalness: 0.72,
    roughness: 0.3,
  }),

  belt: new THREE.MeshStandardMaterial({
    color: 0x34465f,
    metalness: 0.05,
    roughness: 0.8,
  }),

  chain: new THREE.MeshStandardMaterial({
    color: 0x65758b,
    metalness: 0.75,
    roughness: 0.32,
  }),

  guide: new THREE.MeshStandardMaterial({
    color: 0x71839b,
    metalness: 0.35,
    roughness: 0.55,
  }),
};

/* =========================================================
   KHỞI TẠO THREE.JS
   ========================================================= */

function initializeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeaf0f8);

  camera = new THREE.PerspectiveCamera(
    45,
    canvasContainer.clientWidth / canvasContainer.clientHeight,
    0.1,
    100,
  );

  camera.position.set(7, 6, 9);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  canvasContainer.appendChild(renderer.domElement);

  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.06;
  orbitControls.minDistance = 4;
  orbitControls.maxDistance = 18;
  orbitControls.target.set(0, 0.7, 0);

  const ambientLight = new THREE.HemisphereLight(0xffffff, 0x8798ae, 2.1);

  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 2.4);
  mainLight.position.set(6, 10, 7);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(2048, 2048);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xc6dcff, 1.1);
  fillLight.position.set(-7, 4, -5);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({
      color: 0xe4ebf5,
      roughness: 0.9,
    }),
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.08;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(20, 30, 0xb5c5d9, 0xd2dce9);
  grid.position.y = -0.065;
  scene.add(grid);

  window.addEventListener("resize", handleResize);

  loadModel(currentModel);
  animate();

  loadingElement.hidden = true;
}

/* =========================================================
   HÀM TẠO HÌNH CƠ BẢN
   ========================================================= */

function createMesh(geometry, material, parent, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);
  return mesh;
}

function createCylinder(radius, depth, material, parent, position = [0, 0, 0]) {
  const geometry = new THREE.CylinderGeometry(radius, radius, depth, 48);

  return createMesh(geometry, material, parent, position);
}

function createBox(
  width,
  height,
  depth,
  material,
  parent,
  position = [0, 0, 0],
) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  return createMesh(geometry, material, parent, position);
}

function createShaft(parent, x, z, length = 0.7) {
  const shaft = createCylinder(0.12, length, MATERIALS.silver, parent, [
    x,
    0,
    z,
  ]);

  shaft.rotation.z = Math.PI / 2;
  return shaft;
}

function createLabel(text, position, parent) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 512;
  canvas.height = 128;

  context.fillStyle = "rgba(255,255,255,0.94)";
  context.beginPath();
  context.roundRect(8, 8, 496, 112, 22);
  context.fill();

  context.strokeStyle = "#c6d6e9";
  context.lineWidth = 5;
  context.stroke();

  context.fillStyle = "#263d5b";
  context.font = "bold 38px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.set(...position);
  sprite.scale.set(2.1, 0.52, 1);
  sprite.visible = showLabels;

  parent.add(sprite);
  currentLabels.push(sprite);

  return sprite;
}

/* =========================================================
   DỌN MÔ HÌNH CŨ
   ========================================================= */

function clearCurrentModel() {
  if (!currentGroup) return;

  currentGroup.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }

    if (
      object.material &&
      !Object.values(MATERIALS).includes(object.material)
    ) {
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  });

  scene.remove(currentGroup);
  currentGroup = null;
  currentObjects = {};
  currentLabels = [];
}

/* =========================================================
   MÔ HÌNH 1: TRUYỀN ĐỘNG BÁNH RĂNG
   Hai trục song song, bánh răng nằm trên mặt phẳng XZ.
   ========================================================= */

function buildGearModel() {
  const group = new THREE.Group();
  scene.add(group);
  currentGroup = group;

  const z1 = parameters.gearDriverTeeth;
  const z2 = parameters.gearDrivenTeeth;

  const r1 = z1 * 0.055;
  const r2 = z2 * 0.055;
  const distance = r1 + r2;

  const gear1 = new THREE.Group();
  const gear2 = new THREE.Group();

  gear1.position.set(-distance / 2, 0.85, 0);
  gear2.position.set(distance / 2, 0.85, 0);

  group.add(gear1, gear2);

  function makeGear(parent, teeth, radius, material) {
    const rootRadius = radius * 0.88;

    createCylinder(rootRadius, 0.42, material, parent, [0, 0, 0]);

    const toothWidth = Math.max(0.075, radius * 0.19);

    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;

      const tooth = createBox(
        toothWidth,
        0.42,
        radius * 0.25,
        material,
        parent,
      );

      tooth.position.set(
        Math.sin(angle) * (radius - toothWidth * 0.2),
        0,
        Math.cos(angle) * (radius - toothWidth * 0.2),
      );

      tooth.rotation.y = angle;
    }

    createCylinder(radius * 0.23, 0.5, MATERIALS.dark, parent);

    createCylinder(radius * 0.11, 0.54, MATERIALS.silver, parent);
  }

  makeGear(gear1, z1, r1, MATERIALS.blue);
  makeGear(gear2, z2, r2, MATERIALS.orange);

  createShaft(group, -distance / 2, 0);
  createShaft(group, distance / 2, 0);

  createLabel("Bánh dẫn", [-distance / 2, 1.65, 0], group);
  createLabel("Bánh bị dẫn", [distance / 2, 1.65, 0], group);

  currentObjects = {
    gear1,
    gear2,
    driverTeeth: z1,
    drivenTeeth: z2,
    ratio: z2 / z1,
  };

  updateObservation();
}

/* =========================================================
   HÀM TẠO ĐƯỜNG ĐAI VÀ XÍCH
   Đường đi được dựng quanh hai bánh theo mặt phẳng XZ.
   ========================================================= */

function createOpenBeltPath(centerDistance, radius1, radius2, y) {
  const halfDistance = centerDistance / 2;
  const alpha = Math.asin((radius2 - radius1) / centerDistance);

  const points = [];

  const addPoint = (cx, cz, radius, angle) => {
    points.push(
      new THREE.Vector3(
        cx + radius * Math.cos(angle),
        y,
        cz + radius * Math.sin(angle),
      ),
    );
  };

  // Cung quanh bánh thứ nhất.
  for (let i = 0; i <= 32; i++) {
    const angle = -alpha + ((Math.PI + 2 * alpha) * i) / 32;
    addPoint(-halfDistance, 0, radius1, angle);
  }

  // Cung quanh bánh thứ hai.
  for (let i = 0; i <= 32; i++) {
    const angle = Math.PI + alpha + ((Math.PI - 2 * alpha) * i) / 32;
    addPoint(halfDistance, 0, radius2, angle);
  }

  return new THREE.CatmullRomCurve3(points, true);
}

/* =========================================================
   MÔ HÌNH 2: TRUYỀN ĐỘNG ĐAI
   ========================================================= */

function buildBeltModel() {
  const group = new THREE.Group();
  scene.add(group);

  const d1 = parameters.beltDriverDiameter;
  const d2 = parameters.beltDrivenDiameter;

  const r1 = d1 / 2;
  const r2 = d2 / 2;
  const distance = 4.6;

  const p1 = new THREE.Group();
  const p2 = new THREE.Group();

  p1.position.set(-distance / 2, 0.85, 0);
  p2.position.set(distance / 2, 0.85, 0);

  group.add(p1, p2);

  function makePulley(parent, radius, material) {
    createCylinder(radius, 0.38, material, parent);

    createCylinder(radius * 0.28, 0.46, MATERIALS.dark, parent);

    createCylinder(radius * 0.12, 0.5, MATERIALS.silver, parent);

    const rim = createCylinder(
      radius * 0.96,
      0.08,
      MATERIALS.dark,
      parent,
      [0, 0.22, 0],
    );

    return rim;
  }

  makePulley(p1, r1, MATERIALS.blue);
  makePulley(p2, r2, MATERIALS.orange);

  createShaft(group, -distance / 2, 0);
  createShaft(group, distance / 2, 0);

  const beltCurve = createOpenBeltPath(distance, r1, r2, 0.85);

  const beltGeometry = new THREE.TubeGeometry(beltCurve, 120, 0.075, 10, true);

  createMesh(beltGeometry, MATERIALS.belt, group);

  createLabel("Bánh đai dẫn", [-distance / 2, 1.65, 0], group);
  createLabel("Bánh đai bị dẫn", [distance / 2, 1.65, 0], group);

  currentObjects = {
    driver: p1,
    driven: p2,
    diameter1: d1,
    diameter2: d2,
    ratio: d2 / d1,
  };

  updateObservation();
}

/* =========================================================
   MÔ HÌNH 3: TRUYỀN ĐỘNG XÍCH
   ========================================================= */

function buildChainModel() {
  const group = new THREE.Group();
  scene.add(group);

  const z1 = parameters.chainDriverTeeth;
  const z2 = parameters.chainDrivenTeeth;

  const r1 = z1 * 0.045;
  const r2 = z2 * 0.045;
  const distance = 4.7;

  const p1 = new THREE.Group();
  const p2 = new THREE.Group();

  p1.position.set(-distance / 2, 0.85, 0);
  p2.position.set(distance / 2, 0.85, 0);

  group.add(p1, p2);

  function makeSprocket(parent, teeth, radius, material) {
    createCylinder(radius * 0.82, 0.3, material, parent);

    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;

      const tooth = createBox(0.13, 0.3, 0.22, material, parent);

      tooth.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);

      tooth.rotation.y = angle;
    }

    createCylinder(radius * 0.25, 0.4, MATERIALS.dark, parent);

    createCylinder(radius * 0.1, 0.45, MATERIALS.silver, parent);
  }

  makeSprocket(p1, z1, r1, MATERIALS.blue);
  makeSprocket(p2, z2, r2, MATERIALS.orange);

  createShaft(group, -distance / 2, 0);
  createShaft(group, distance / 2, 0);

  const chainCurve = createOpenBeltPath(distance, r1, r2, 0.85);

  const chainPath = chainCurve.getPoints(160);

  const linkGroup = new THREE.Group();
  group.add(linkGroup);

  chainPath.forEach((point, index) => {
    if (index % 3 !== 0) return;

    const link = createBox(0.17, 0.12, 0.09, MATERIALS.chain, linkGroup, [
      point.x,
      point.y,
      point.z,
    ]);

    const nextPoint = chainPath[Math.min(index + 1, chainPath.length - 1)];

    link.rotation.y = Math.atan2(nextPoint.x - point.x, nextPoint.z - point.z);
  });

  createLabel("Đĩa xích dẫn", [-distance / 2, 1.65, 0], group);
  createLabel("Đĩa xích bị dẫn", [distance / 2, 1.65, 0], group);

  currentObjects = {
    driver: p1,
    driven: p2,
    links: linkGroup,
    teeth1: z1,
    teeth2: z2,
    ratio: z2 / z1,
  };

  updateObservation();
}

/* =========================================================
   MÔ HÌNH 4: TAY QUAY - CON TRƯỢT
   ========================================================= */

function buildCrankModel() {
  const group = new THREE.Group();
  scene.add(group);

  const radius = parameters.crankRadius;
  const rodLength = 2.8;

  const crankCenter = new THREE.Vector3(-1.7, 1.05, 0);

  const crank = new THREE.Group();
  crank.position.copy(crankCenter);
  group.add(crank);

  createCylinder(0.38, 0.32, MATERIALS.dark, crank);

  createCylinder(0.17, 0.4, MATERIALS.silver, crank);

  const crankArm = createBox(radius, 0.16, 0.2, MATERIALS.blue, crank, [
    radius / 2,
    0,
    0,
  ]);

  const crankPin = createCylinder(0.16, 0.25, MATERIALS.orange, crank, [
    radius,
    0,
    0,
  ]);

  const sliderX = 2.1;

  createBox(5.8, 0.12, 0.18, MATERIALS.guide, group, [0.2, 0.65, 0]);

  const slider = new THREE.Group();
  group.add(slider);

  createBox(0.7, 0.42, 0.55, MATERIALS.orange, slider);

  const rodGeometry = new THREE.BoxGeometry(rodLength, 0.13, 0.16);

  const rod = createMesh(rodGeometry, MATERIALS.blue, group);

  currentObjects = {
    crank,
    crankArm,
    crankPin,
    slider,
    rod,
    crankCenter,
    radius,
    rodLength,
    sliderX,
  };

  updateCrankPosition(0);

  createLabel("Tay quay", [-1.7, 2.1, 0], group);
  createLabel("Thanh truyền", [0.1, 1.8, 0], group);
  createLabel("Con trượt", [2.1, 1.35, 0], group);

  updateObservation();
}

function updateCrankPosition(angle) {
  const { crank, slider, rod, crankCenter, radius, rodLength, sliderX } =
    currentObjects;

  if (!crank || !slider || !rod) return;

  crank.rotation.z = angle;

  const pinX = crankCenter.x + radius * Math.cos(angle);
  const pinY = crankCenter.y + radius * Math.sin(angle);

  const verticalDistance = pinY - 0.65;
  const horizontalDistance = Math.sqrt(
    Math.max(0, rodLength * rodLength - verticalDistance * verticalDistance),
  );

  const x = pinX + horizontalDistance;

  slider.position.set(x, 0.65, 0);

  const midpointX = (pinX + x) / 2;
  const midpointY = (pinY + 0.65) / 2;

  const directionAngle = Math.atan2(0.65 - pinY, x - pinX);

  rod.position.set(midpointX, midpointY, 0);
  rod.rotation.z = directionAngle;
}

/* =========================================================
   TẢI MÔ HÌNH
   ========================================================= */

function loadModel(modelName) {
  if (!scene) return;

  clearCurrentModel();

  currentModel = modelName;
  elapsedTime = 0;

  currentGroup = new THREE.Group();
  scene.add(currentGroup);
  scene.remove(currentGroup);

  switch (modelName) {
    case "gear":
      buildGearModel();
      break;

    case "belt":
      buildBeltModel();
      break;

    case "chain":
      buildChainModel();
      break;

    case "crank":
      buildCrankModel();
      break;

    default:
      buildGearModel();
      currentModel = "gear";
  }

  const info = MODEL_INFO[currentModel];

  viewerTitle.textContent = info.title;
  modelTypeLabel.textContent = info.type;

  principleElement.textContent = info.principle;
  characteristicElement.textContent = info.characteristic;

  componentsElement.replaceChildren();

  info.components.forEach((component) => {
    const li = document.createElement("li");
    li.textContent = component;
    componentsElement.appendChild(li);
  });

  resultModel.textContent = info.title;
  resultNote.textContent = info.note;

  modelButtons.forEach((button) => {
    const active = button.dataset.model === currentModel;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  renderSpecificControls();
  resetCamera();
  updateObservation();
}

/* =========================================================
   ĐIỀU KHIỂN MÔ HÌNH
   ========================================================= */

function updateModel(deltaTime) {
  if (isPaused || !currentObjects) return;

  const movement = deltaTime * speedMultiplier;

  switch (currentModel) {
    case "gear": {
      const ratio = currentObjects.ratio;
      const angle = movement * 0.8;

      currentObjects.gear1.rotation.y += angle;
      currentObjects.gear2.rotation.y -= angle / ratio;
      break;
    }

    case "belt": {
      const ratio = currentObjects.ratio;
      const angle = movement * 0.8;

      currentObjects.driver.rotation.y += angle;
      currentObjects.driven.rotation.y += angle / ratio;
      break;
    }

    case "chain": {
      const ratio = currentObjects.ratio;
      const angle = movement * 0.8;

      currentObjects.driver.rotation.y += angle;
      currentObjects.driven.rotation.y += angle / ratio;
      break;
    }

    case "crank": {
      const angle = elapsedTime * speedMultiplier * 1.2;
      updateCrankPosition(angle);
      break;
    }
  }
}

/* =========================================================
   KẾT QUẢ QUAN SÁT
   ========================================================= */

function updateObservation() {
  if (currentModel === "gear") {
    resultDriver.textContent = "Cùng một chiều quay quy ước";
    resultDriven.textContent = "Ngược chiều bánh dẫn";
    resultRatio.textContent = currentObjects.ratio.toFixed(2);
    return;
  }

  if (currentModel === "belt") {
    resultDriver.textContent = "Theo chiều bánh dẫn";
    resultDriven.textContent = "Cùng chiều bánh dẫn";
    resultRatio.textContent = currentObjects.ratio.toFixed(2);
    return;
  }

  if (currentModel === "chain") {
    resultDriver.textContent = "Theo chiều bánh dẫn";
    resultDriven.textContent = "Cùng chiều bánh dẫn";
    resultRatio.textContent = currentObjects.ratio.toFixed(2);
    return;
  }

  if (currentModel === "crank") {
    resultDriver.textContent = "Chuyển động quay";
    resultDriven.textContent = "Tịnh tiến qua lại";
    resultRatio.textContent = "2 × bán kính tay quay";
    resultNote.textContent = `Hành trình lý thuyết: ${(parameters.crankRadius * 2).toFixed(2)} đơn vị mô phỏng.`;
  }
}

/* =========================================================
   TẠO BỘ ĐIỀU KHIỂN RIÊNG CHO TỪNG MÔ HÌNH
   ========================================================= */

function createRangeControl({
  id,
  label,
  min,
  max,
  step,
  value,
  unit = "",
  onChange,
}) {
  const wrapper = document.createElement("div");
  wrapper.className = "dynamic-control";

  const heading = document.createElement("div");
  heading.className = "control-label";

  const labelElement = document.createElement("label");
  labelElement.htmlFor = id;
  labelElement.textContent = label;

  const output = document.createElement("output");
  output.htmlFor = id;
  output.textContent = `${value}${unit}`;

  const input = document.createElement("input");
  input.type = "range";
  input.id = id;
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;

  input.addEventListener("input", () => {
    const nextValue = Number(input.value);
    output.textContent = `${nextValue}${unit}`;
    onChange(nextValue);
  });

  heading.append(labelElement, output);
  wrapper.append(heading, input);

  return wrapper;
}

function renderSpecificControls() {
  specificControls.replaceChildren();

  if (currentModel === "gear") {
    specificControls.append(
      createRangeControl({
        id: "driver-teeth",
        label: "Số răng bánh dẫn",
        min: 12,
        max: 30,
        step: 2,
        value: parameters.gearDriverTeeth,
        onChange: (value) => {
          parameters.gearDriverTeeth = value;
          loadModel("gear");
        },
      }),

      createRangeControl({
        id: "driven-teeth",
        label: "Số răng bánh bị dẫn",
        min: 12,
        max: 40,
        step: 2,
        value: parameters.gearDrivenTeeth,
        onChange: (value) => {
          parameters.gearDrivenTeeth = value;
          loadModel("gear");
        },
      }),
    );
  }

  if (currentModel === "belt") {
    specificControls.append(
      createRangeControl({
        id: "belt-driver",
        label: "Đường kính bánh đai dẫn",
        min: 1.4,
        max: 3.2,
        step: 0.2,
        value: parameters.beltDriverDiameter,
        unit: " đơn vị",
        onChange: (value) => {
          parameters.beltDriverDiameter = value;
          loadModel("belt");
        },
      }),

      createRangeControl({
        id: "belt-driven",
        label: "Đường kính bánh đai bị dẫn",
        min: 1.4,
        max: 3.2,
        step: 0.2,
        value: parameters.beltDrivenDiameter,
        unit: " đơn vị",
        onChange: (value) => {
          parameters.beltDrivenDiameter = value;
          loadModel("belt");
        },
      }),
    );
  }

  if (currentModel === "chain") {
    specificControls.append(
      createRangeControl({
        id: "chain-driver",
        label: "Số răng đĩa xích dẫn",
        min: 12,
        max: 30,
        step: 2,
        value: parameters.chainDriverTeeth,
        onChange: (value) => {
          parameters.chainDriverTeeth = value;
          loadModel("chain");
        },
      }),

      createRangeControl({
        id: "chain-driven",
        label: "Số răng đĩa xích bị dẫn",
        min: 12,
        max: 40,
        step: 2,
        value: parameters.chainDrivenTeeth,
        onChange: (value) => {
          parameters.chainDrivenTeeth = value;
          loadModel("chain");
        },
      }),
    );
  }

  if (currentModel === "crank") {
    specificControls.append(
      createRangeControl({
        id: "crank-radius",
        label: "Bán kính tay quay",
        min: 0.6,
        max: 1.4,
        step: 0.1,
        value: parameters.crankRadius,
        unit: " đơn vị",
        onChange: (value) => {
          parameters.crankRadius = value;
          loadModel("crank");
        },
      }),
    );
  }
}

/* =========================================================
   CAMERA
   ========================================================= */

function resetCamera() {
  if (!camera || !orbitControls) return;

  camera.position.set(7, 6, 9);
  orbitControls.target.set(0, 0.7, 0);
  orbitControls.update();
}

function handleResize() {
  if (!camera || !renderer) return;

  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

/* =========================================================
   VÒNG LẶP ANIMATION
   ========================================================= */

function animate(timestamp = 0) {
  animationFrameId = requestAnimationFrame(animate);

  const deltaTime = previousTime
    ? Math.min((timestamp - previousTime) / 1000, 0.05)
    : 0;

  previousTime = timestamp;

  if (!isPaused) {
    elapsedTime += deltaTime;
    updateModel(deltaTime);
  }

  orbitControls.update();
  renderer.render(scene, camera);
}

/* =========================================================
   SỰ KIỆN GIAO DIỆN
   ========================================================= */

modelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    loadModel(button.dataset.model);
  });
});

speedControl.addEventListener("input", () => {
  speedMultiplier = Number(speedControl.value);
  speedValue.textContent = `${speedMultiplier.toFixed(1)}×`;
});

motionButton.addEventListener("click", () => {
  isPaused = !isPaused;

  motionButton.setAttribute("aria-pressed", String(isPaused));
  motionText.textContent = isPaused ? "Tiếp tục" : "Tạm dừng";
  motionIcon.textContent = isPaused ? "▶" : "Ⅱ";
});

resetCameraButton.addEventListener("click", resetCamera);

labelsButton.addEventListener("click", () => {
  showLabels = !showLabels;

  currentLabels.forEach((label) => {
    label.visible = showLabels;
  });

  labelsButton.setAttribute("aria-pressed", String(showLabels));
  labelsText.textContent = showLabels ? "Ẩn chú thích" : "Hiện chú thích";
});

retryButton.addEventListener("click", () => {
  errorElement.hidden = true;
  loadingElement.hidden = false;

  try {
    initializeScene();
  } catch (error) {
    console.error("Không thể khởi tạo lại mô hình 3D:", error);
    loadingElement.hidden = true;
    errorElement.hidden = false;
  }
});

/* =========================================================
   KHỞI ĐỘNG
   ========================================================= */

try {
  initializeScene();
} catch (error) {
  console.error("Lỗi khởi tạo 3D Engineering Lab:", error);

  loadingElement.hidden = true;
  errorElement.hidden = false;
}
