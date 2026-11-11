import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Erzeugt Vorschaubilder einzelner Komponenten direkt aus dem 3D-Modell
 * (keine Fremdbilder → keine erfundenen Darstellungen).
 * Ein einziger kleiner Offscreen-Renderer wird wiederverwendet.
 */
let renderer = null;
let scene = null;
let camera = null;
const cache = new Map();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(360, 240, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 1.4));
  const d = new THREE.DirectionalLight('#ffffff', 1.5);
  d.position.set(3, 5, 4);
  scene.add(d);
  camera = new THREE.PerspectiveCamera(30, 1.5, 0.01, 100);
}

export function componentThumbnail(key, group) {
  if (cache.has(key)) return cache.get(key);
  if (!renderer) init();

  const clone = group.clone(true);
  clone.position.set(0, 0, 0);
  const toRemove = [];
  clone.traverse((o) => {
    if (o.isCSS2DObject) toRemove.push(o);
    if (o.isMesh) {
      const src = o.material;
      const m = src.clone();
      const orig = src.userData.orig;
      if (orig) {
        if (m.emissive && orig.emissive) m.emissive.copy(orig.emissive);
        m.emissiveIntensity = orig.emissiveIntensity;
        m.opacity = Math.max(orig.opacity, 0.55);
        m.transparent = orig.transparent;
        m.depthWrite = true;
      }
      m.clippingPlanes = null;
      o.material = m;
    }
  });
  toRemove.forEach((o) => o.parent.remove(o));
  scene.add(clone);
  clone.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(clone);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 0.15);
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.95;
  camera.position.copy(center).add(new THREE.Vector3(0.75, 0.55, 1).normalize().multiplyScalar(dist));
  camera.lookAt(center);
  camera.near = dist / 50;
  camera.far = dist * 10;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(clone);
  clone.traverse((o) => o.isMesh && o.material.dispose());
  cache.set(key, url);
  return url;
}

export function clearThumbnailCache() {
  cache.clear();
}
