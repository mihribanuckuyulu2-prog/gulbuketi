import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import GUI from 'lil-gui';

const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0f19');
scene.fog = new THREE.Fog('#0b0f19', 11, 24);

const sizes = { width: window.innerWidth, height: window.innerHeight };

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
scene.environment = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
scene.environmentIntensity = 0.35;
pmremGenerator.dispose();
roomEnvironment.dispose();

const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
camera.position.set(2.8, 3.4, 6.2);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 1.5, 0);
controls.minDistance = 3;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.49;

const gui = new GUI({ title: 'Kırmızı Gül Buketi' });

const keyLight = new THREE.DirectionalLight(0xfff1e0, 3);
keyLight.position.set(4.5, 7, 4.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 24;
keyLight.shadow.camera.left = -5;
keyLight.shadow.camera.right = 5;
keyLight.shadow.camera.top = 5;
keyLight.shadow.camera.bottom = -5;
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.02;
keyLight.target.position.set(0, 1.2, 0);
scene.add(keyLight, keyLight.target);

const fillLight = new THREE.HemisphereLight(0x8fb4ff, 0x1a0d12, 0.85);
scene.add(fillLight);

const rimLight = new THREE.SpotLight(0x7dd3fc, 70, 16, Math.PI * 0.22, 0.35, 1.5);
rimLight.position.set(-4, 6, -4);
rimLight.castShadow = true;
rimLight.shadow.mapSize.set(1024, 1024);
rimLight.shadow.bias = -0.0006;
rimLight.shadow.camera.near = 1;
rimLight.shadow.camera.far = 18;
rimLight.target.position.set(0, 1.6, 0);
scene.add(rimLight, rimLight.target);

const movingPointLight = new THREE.PointLight(0xffb45e, 12, 9, 1.6);
movingPointLight.position.set(2.5, 2.5, 0);
movingPointLight.castShadow = true;
movingPointLight.shadow.mapSize.set(1024, 1024);
movingPointLight.shadow.bias = -0.0008;
scene.add(movingPointLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 16),
  new THREE.MeshStandardMaterial({ color: 0x191016, roughness: 0.85, metalness: 0.15 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function createPetalGeometry() {
  const width = 0.75;
  const height = 1.05;
  const geometry = new THREE.PlaneGeometry(width, height, 8, 12);
  geometry.translate(0, height / 2, 0);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const v = THREE.MathUtils.clamp(y / height, 0, 1);
    const nx = x / (width * 0.5);

    const roundTop = v > 0.8 ? 1 - 0.3 * Math.pow((v - 0.8) / 0.2, 2) : 1;
    const taper = (0.25 + 0.75 * Math.pow(v, 0.65)) * roundTop;
    const cup = 0.2 * nx * nx * (0.3 + 0.7 * v);
    const curl = 0.42 * Math.pow(v, 2.2);
    const wave = 0.03 * Math.sin(nx * Math.PI) * v;

    position.setX(i, x * taper);
    position.setZ(i, cup + curl + wave);
  }

  geometry.computeVertexNormals();
  return geometry;
}

const petalGeometry = createPetalGeometry();

const petalInnerMaterial = new THREE.MeshStandardMaterial({
  color: 0x5f0716,
  roughness: 0.55,
  metalness: 0.02,
  side: THREE.DoubleSide
});

const petalOuterMaterial = new THREE.MeshStandardMaterial({
  color: 0xb80f2b,
  roughness: 0.45,
  metalness: 0.02,
  side: THREE.DoubleSide
});

const budGeometry = new THREE.SphereGeometry(0.085, 16, 12);
const budMaterial = new THREE.MeshStandardMaterial({ color: 0x4c0612, roughness: 0.8 });

const roseRings = [
  { count: 4, radius: 0.04, tilt: 0.1, scale: 0.45, y: 0.24, offset: 0.0 },
  { count: 5, radius: 0.09, tilt: 0.28, scale: 0.55, y: 0.17, offset: 0.7 },
  { count: 6, radius: 0.15, tilt: 0.52, scale: 0.68, y: 0.1, offset: 1.3 },
  { count: 7, radius: 0.22, tilt: 0.82, scale: 0.84, y: 0.04, offset: 2.0 },
  { count: 8, radius: 0.3, tilt: 1.08, scale: 1.0, y: 0.0, offset: 2.6 }
];

function createRose() {
  const rose = new THREE.Group();
  const innerGeometries = [];
  const outerGeometries = [];
  const basePosition = new THREE.Vector3();
  const scaleVector = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();

  roseRings.forEach((ring, ringIndex) => {
    for (let i = 0; i < ring.count; i++) {
      const angle = (i / ring.count) * Math.PI * 2 + ring.offset;
      const geometry = petalGeometry.clone();
      const pivotMatrix = new THREE.Matrix4().makeRotationY(angle);
      const localMatrix = new THREE.Matrix4();

      const jitter = Math.sin(ringIndex * 12.9898 + i * 78.233) * 0.06;
      basePosition.set(0, ring.y, ring.radius);
      euler.set(ring.tilt, jitter, 0);
      rotation.setFromEuler(euler);
      scaleVector.setScalar(ring.scale);
      localMatrix.compose(basePosition, rotation, scaleVector);

      geometry.applyMatrix4(pivotMatrix.multiply(localMatrix));

      if (ringIndex < 2) {
        innerGeometries.push(geometry);
      } else {
        outerGeometries.push(geometry);
      }
    }
  });

  const innerMesh = new THREE.Mesh(mergeGeometries(innerGeometries), petalInnerMaterial);
  const outerMesh = new THREE.Mesh(mergeGeometries(outerGeometries), petalOuterMaterial);

  innerMesh.castShadow = true;
  innerMesh.receiveShadow = true;
  outerMesh.castShadow = true;
  outerMesh.receiveShadow = true;

  const bud = new THREE.Mesh(budGeometry, budMaterial);
  bud.position.y = 0.3;
  bud.scale.y = 1.25;
  bud.castShadow = true;
  bud.receiveShadow = true;

  rose.add(innerMesh, outerMesh, bud);
  return rose;
}

function createLeafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.22, 0.16, 0.3, 0.58, 0, 1);
  shape.bezierCurveTo(-0.3, 0.58, -0.22, 0.16, 0, 0);

  const geometry = new THREE.ShapeGeometry(shape, 24);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    position.setZ(i, -0.18 * Math.sin(Math.PI * y) + 0.12 * x * x);
  }

  geometry.computeVertexNormals();
  return geometry;
}

const leafGeometry = createLeafGeometry();
const leafMaterial = new THREE.MeshStandardMaterial({
  color: 0x2f6b3a,
  roughness: 0.7,
  metalness: 0,
  side: THREE.DoubleSide
});
const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x2f5d36, roughness: 0.75 });

const bouquet = new THREE.Group();
scene.add(bouquet);

const upAxis = new THREE.Vector3(0, 1, 0);

function createVasePatternTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, size, size);
  context.strokeStyle = '#e8c97f';
  context.fillStyle = '#e8c97f';
  context.lineCap = 'round';

  const step = size / 4;
  context.lineWidth = 2.5;
  context.globalAlpha = 0.95;

  for (let i = -6; i <= 10; i++) {
    const c = i * step;

    context.beginPath();
    context.moveTo(c - size, -size);
    context.lineTo(c + size * 2, size * 2);
    context.stroke();

    context.beginPath();
    context.moveTo(c + size, -size);
    context.lineTo(c - size * 2, size * 2);
    context.stroke();
  }

  context.globalAlpha = 1;

  const half = step / 2;
  for (let i = -2; i <= 10; i++) {
    for (let j = -2; j <= 10; j++) {
      if ((i + j) % 2 !== 0) continue;
      const cx = i * half;
      const cy = j * half;

      for (let k = 0; k < 4; k++) {
        const angle = (k / 4) * Math.PI * 2;
        context.beginPath();
        context.arc(cx + Math.cos(angle) * 7, cy + Math.sin(angle) * 7, 3.4, 0, Math.PI * 2);
        context.fill();
      }

      context.beginPath();
      context.arc(cx, cy, 3.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xeaf6ff,
  metalness: 0,
  roughness: 0.06,
  transmission: 1,
  thickness: 0.12,
  ior: 1.5,
  side: THREE.DoubleSide,
  envMapIntensity: 1.4
});

const vaseProfile = [
  new THREE.Vector2(0.0, 0.0),
  new THREE.Vector2(0.26, 0.015),
  new THREE.Vector2(0.36, 0.05),
  new THREE.Vector2(0.48, 0.16),
  new THREE.Vector2(0.54, 0.36),
  new THREE.Vector2(0.52, 0.6),
  new THREE.Vector2(0.45, 0.86),
  new THREE.Vector2(0.37, 1.1),
  new THREE.Vector2(0.33, 1.3),
  new THREE.Vector2(0.35, 1.42),
  new THREE.Vector2(0.355, 1.46)
];

const vase = new THREE.Mesh(new THREE.LatheGeometry(vaseProfile, 64), glassMaterial);
vase.castShadow = false;
vase.receiveShadow = false;
scene.add(vase);

const vaseRim = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.012, 12, 64), glassMaterial);
vaseRim.rotation.x = Math.PI / 2;
vaseRim.position.y = 1.46;
scene.add(vaseRim);

const vasePatternTexture = createVasePatternTexture();

const vasePatternMaterial = new THREE.MeshStandardMaterial({
  map: vasePatternTexture,
  transparent: true,
  alphaTest: 0.05,
  metalness: 0.8,
  roughness: 0.32,
  emissive: 0x2a1c06,
  emissiveIntensity: 0.5,
  envMapIntensity: 2.2,
  side: THREE.DoubleSide,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1
});

const vasePatternProfile = vaseProfile.map((point) => new THREE.Vector2(point.x * 1.006, point.y));
const vasePattern = new THREE.Mesh(new THREE.LatheGeometry(vasePatternProfile, 64), vasePatternMaterial);
scene.add(vasePattern);

const goldMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8b25f,
  metalness: 1,
  roughness: 0.28,
  envMapIntensity: 2.5
});

const addGoldRing = (y, radius, tube) => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.004, tube, 12, 96), goldMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  ring.castShadow = true;
  scene.add(ring);
};

addGoldRing(0.36, 0.54, 0.012);
addGoldRing(0.86, 0.45, 0.01);
addGoldRing(1.34, 0.343, 0.009);

const waterMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x9fd6ea,
  metalness: 0,
  roughness: 0.15,
  transmission: 0.7,
  thickness: 0.8,
  ior: 1.33
});

const water = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.38, 1.0, 48), waterMaterial);
water.position.y = 0.6;
scene.add(water);

const waterSurface = new THREE.Mesh(
  new THREE.CircleGeometry(0.33, 48),
  new THREE.MeshPhysicalMaterial({
    color: 0xc8ecff,
    roughness: 0.05,
    metalness: 0,
    transmission: 0.5,
    ior: 1.33,
    side: THREE.DoubleSide
  })
);
waterSurface.rotation.x = -Math.PI / 2;
waterSurface.position.y = 1.1;
scene.add(waterSurface);

const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = 256;
shadowCanvas.height = 256;
const shadowContext = shadowCanvas.getContext('2d');
const shadowGradient = shadowContext.createRadialGradient(128, 128, 12, 128, 128, 126);
shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
shadowContext.fillStyle = shadowGradient;
shadowContext.fillRect(0, 0, 256, 256);

const blobShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(2.1, 2.1),
  new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(shadowCanvas),
    transparent: true,
    depthWrite: false
  })
);
blobShadow.rotation.x = -Math.PI / 2;
blobShadow.position.y = 0.004;
scene.add(blobShadow);

function createStem(start, mouth, end, withLeaf) {
  const curve = new THREE.CatmullRomCurve3([start, mouth, end], false, 'centripetal');
  const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.022, 8, false), stemMaterial);
  stem.castShadow = true;
  stem.receiveShadow = true;
  bouquet.add(stem);

  if (!withLeaf) return;

  const point = curve.getPoint(0.82 + Math.random() * 0.1);
  const outward = new THREE.Vector3(point.x, 0, point.z);
  if (outward.lengthSq() < 0.0001) return;
  outward.normalize();

  const leafDir = outward
    .clone()
    .multiplyScalar(Math.cos(0.55))
    .add(upAxis.clone().multiplyScalar(Math.sin(0.55)))
    .normalize();

  const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
  leaf.position.copy(point);
  leaf.quaternion.setFromUnitVectors(upAxis, leafDir);
  leaf.rotateY(Math.random() * Math.PI * 2);
  leaf.scale.setScalar(0.32 + Math.random() * 0.1);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  bouquet.add(leaf);
}

const flowerData = [{ x: 0, z: 0, y: 2.5, scale: 0.4, tilt: 0 }];

const middleCount = 6;
for (let i = 0; i < middleCount; i++) {
  const angle = (i / middleCount) * Math.PI * 2 + Math.PI / 6;
  flowerData.push({
    x: Math.cos(angle) * 0.58,
    z: Math.sin(angle) * 0.58,
    y: 2.3,
    scale: 0.36,
    tilt: 0.3
  });
}

const outerCount = 8;
for (let i = 0; i < outerCount; i++) {
  const angle = (i / outerCount) * Math.PI * 2 + Math.PI / 8;
  flowerData.push({
    x: Math.cos(angle) * 0.95,
    z: Math.sin(angle) * 0.95,
    y: 2.05,
    scale: 0.32,
    tilt: 0.55
  });
}

flowerData.forEach((data, index) => {
  const rose = createRose();
  rose.position.set(data.x, data.y, data.z);
  rose.scale.setScalar(data.scale);

  if (data.tilt > 0) {
    const outward = new THREE.Vector3(data.x, 0, data.z).normalize();
    const axis = new THREE.Vector3().crossVectors(upAxis, outward).normalize();
    rose.quaternion.setFromAxisAngle(axis, data.tilt);
  }

  rose.rotateY(index * 1.37);
  bouquet.add(rose);

  const end = rose.position.clone();
  end.y -= 0.02;

  const stemOutward = new THREE.Vector3(data.x, 0, data.z);
  if (stemOutward.lengthSq() > 0.0001) stemOutward.normalize();

  const start = new THREE.Vector3(data.x * 0.2, 0.16, data.z * 0.2);
  const mouth = new THREE.Vector3(stemOutward.x * 0.26, 1.54, stemOutward.z * 0.26);

  const withLeaf = index >= 7 || (index > 0 && index % 2 === 0);
  createStem(start, mouth, end, withLeaf);
});

const settings = { rotationSpeed: 0.12 };

const bouquetFolder = gui.addFolder('Buket');
bouquetFolder.add(settings, 'rotationSpeed', 0, 0.6, 0.01).name('Dönüş Hızı');

const vaseFolder = gui.addFolder('Cam Vazo');
vaseFolder.add(glassMaterial, 'roughness', 0, 0.4, 0.01).name('Pürüzlülük');
vaseFolder.add(glassMaterial, 'transmission', 0.4, 1, 0.01).name('Şeffaflık');
vaseFolder.add(glassMaterial, 'ior', 1, 2, 0.01).name('Kırılma (IOR)');
vaseFolder.add(glassMaterial, 'envMapIntensity', 0, 3, 0.1).name('Yansıma');
vaseFolder.add(vasePattern, 'visible').name('Altın Desen');

const lightsFolder = gui.addFolder('Işık Şiddetleri');
lightsFolder.add(keyLight, 'intensity', 0, 8, 0.1).name('Ana Işık');
lightsFolder.add(fillLight, 'intensity', 0, 3, 0.05).name('Dolgu Işığı');
lightsFolder.add(rimLight, 'intensity', 0, 200, 1).name('Kenar Işığı');
lightsFolder.add(movingPointLight, 'intensity', 0, 60, 1).name('Hareketli Işık');

const keyLightHelper = new THREE.DirectionalLightHelper(keyLight, 0.5);
const rimLightHelper = new THREE.SpotLightHelper(rimLight);
const pointLightHelper = new THREE.PointLightHelper(movingPointLight, 0.2);
keyLightHelper.visible = false;
rimLightHelper.visible = false;
pointLightHelper.visible = false;
scene.add(keyLightHelper, rimLightHelper, pointLightHelper);

const helpersFolder = gui.addFolder('Işık Yardımcıları');
helpersFolder.add(keyLightHelper, 'visible').name('Ana Işık Helper');
helpersFolder.add(rimLightHelper, 'visible').name('Kenar Işık Helper');
helpersFolder.add(pointLightHelper, 'visible').name('Nokta Işık Helper');

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const clock = new THREE.Clock();
let bouquetRotation = 0;

const tick = () => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  bouquetRotation += delta * settings.rotationSpeed;
  bouquet.rotation.y = bouquetRotation;
  bouquet.position.y = Math.sin(elapsed * 0.9) * 0.008;

  movingPointLight.position.x = Math.sin(elapsed * 0.8) * 2.6;
  movingPointLight.position.z = Math.cos(elapsed * 0.8) * 2.6;
  movingPointLight.position.y = 2.3 + Math.sin(elapsed * 1.6) * 0.8;

  if (keyLightHelper.visible) keyLightHelper.update();
  if (rimLightHelper.visible) rimLightHelper.update();
  if (pointLightHelper.visible) pointLightHelper.update();

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
};

tick();
