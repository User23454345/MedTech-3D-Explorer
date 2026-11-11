import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const HOVER_COLOR = new THREE.Color('#38bdf8');
const SELECT_COLOR = new THREE.Color('#fbbf24');
const HINT_COLOR = new THREE.Color('#22c55e');
const ERROR_COLOR = new THREE.Color('#ef4444');

/**
 * Generischer 3D-Viewer für Gerätemodelle.
 * Ein Gerätemodell liefert `root` und `parts` (id → THREE.Group).
 */
export class Viewer {
  constructor(container) {
    this.container = container;
    this.listeners = { select: [], hover: [] };
    this.tickers = new Set();
    this.components = new Map();
    this.selected = null;
    this.hovered = null;
    this.flash = new Map(); // id → { color, until }
    this.focusMode = false;
    this.explode = 0;
    this.labelsVisible = true;
    this.housingMode = 'ghost';
    this.section = { enabled: false, axis: 'x', value: 0 };
    this.clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    this.dirty = true;
    this.timer = new THREE.Timer();
    this.camAnim = null;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);
    renderer.domElement.classList.add('gl-canvas');
    this.renderer = renderer;

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.classList.add('label-layer');
    container.appendChild(labelRenderer.domElement);
    this.labelRenderer = labelRenderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1220');
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();
    this.scene = scene;

    scene.add(new THREE.HemisphereLight('#dbeafe', '#1e293b', 1.2));
    const key = new THREE.DirectionalLight('#ffffff', 1.6);
    key.position.set(6, 10, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#93c5fd', 0.6);
    rim.position.set(-8, 4, -6);
    scene.add(rim);

    // Boden mit weichem Kontaktschatten (Textur statt Echtzeitschatten → performant)
    const floorTex = this.#radialTexture();
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48),
      new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.001;
    scene.add(floor);
    const grid = new THREE.PolarGridHelper(8, 12, 6, 64, '#1e3a5f', '#16243a');
    grid.position.y = 0.002;
    scene.add(grid);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
    camera.position.set(8, 6, 10);
    this.camera = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 2;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.53;
    controls.addEventListener('change', () => (this.dirty = true));
    controls.addEventListener('start', () => (this.camAnim = null));
    this.controls = controls;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.#bindPointer();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    renderer.setAnimationLoop(() => this.#loop());
  }

  on(evt, fn) {
    this.listeners[evt].push(fn);
  }

  #emit(evt, ...args) {
    this.listeners[evt].forEach((fn) => fn(...args));
  }

  #radialTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(30,58,95,0.95)');
    grad.addColorStop(0.35, 'rgba(15,30,55,0.75)');
    grad.addColorStop(1, 'rgba(11,18,32,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  /* ------------------------------------------------------------ */
  /* Gerät laden                                                   */
  /* ------------------------------------------------------------ */

  loadDevice(model, componentData) {
    this.unloadDevice();
    this.model = model;
    this.scene.add(model.root);
    model.root.updateMatrixWorld(true);

    const deviceBox = new THREE.Box3().setFromObject(model.root);
    const deviceCenter = deviceBox.getCenter(new THREE.Vector3());
    this.deviceBox = deviceBox;

    componentData.forEach((data, index) => {
      const group = model.parts[data.id];
      if (!group) return;
      const meshes = [];
      const materials = new Set();
      group.traverse((o) => {
        if (o.isMesh) {
          o.userData.componentId = data.id;
          meshes.push(o);
          materials.add(o.material);
        }
      });
      for (const m of materials) this.#storeMaterialState(m);
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const dir = center.clone().sub(deviceCenter);
      dir.y *= 0.6;
      if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
      dir.normalize().multiplyScalar(group.userData.explodeScale ?? 1);

      const label = this.#makeLabel(index + 1, data);
      if (group.userData.labelAt) label.position.copy(group.userData.labelAt);
      else label.position.set(center.x, box.max.y + 0.12, center.z);
      group.add(label);

      this.components.set(data.id, {
        id: data.id,
        index: index + 1,
        data,
        group,
        meshes,
        materials: [...materials],
        center,
        box,
        explodeDir: dir,
        label,
      });
    });

    // alle Materialien (inkl. Gehäuse) für Schnittebene/Transparenz registrieren
    this.allMaterials = new Set();
    model.root.traverse((o) => {
      if (o.isMesh) {
        this.allMaterials.add(o.material);
        this.#storeMaterialState(o.material);
      }
    });
    this.housingMaterials = new Set();
    model.housing.traverse((o) => o.isMesh && this.housingMaterials.add(o.material));

    this.setHousingMode(this.housingMode);
    this.setSection(this.section);
    this.setExplode(0);
    this.setLabels(this.labelsVisible);
    this.resetView(false);
    this.dirty = true;
  }

  unloadDevice() {
    if (!this.model) return;
    this.scene.remove(this.model.root);
    this.model.root.traverse((o) => {
      if (o.isCSS2DObject) o.element.remove();
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    this.components.clear();
    this.tickers.clear();
    this.selected = this.hovered = null;
    this.model = null;
    this.dirty = true;
  }

  #storeMaterialState(m) {
    if (m.userData.orig) return;
    m.userData.orig = {
      emissive: m.emissive ? m.emissive.clone() : null,
      emissiveIntensity: m.emissiveIntensity ?? 1,
      opacity: m.opacity,
      transparent: m.transparent,
      depthWrite: m.depthWrite,
    };
  }

  #makeLabel(num, data) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'label3d';
    el.innerHTML = `<span class="num">${num}</span><span class="txt">${data.kurz}</span>`;
    el.title = data.name;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.select(data.id, { source: 'label' });
    });
    const obj = new CSS2DObject(el);
    obj.center.set(0.5, 1);
    return obj;
  }

  /* ------------------------------------------------------------ */
  /* Interaktion                                                   */
  /* ------------------------------------------------------------ */

  #bindPointer() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6 || e.button !== 0) return;
      const id = this.pick(e);
      if (this.pickHandler && this.pickHandler(id) === false) return;
      if (id) this.select(id, { source: 'scene' });
      else this.select(null);
    });
    el.addEventListener('dblclick', (e) => {
      const id = this.pick(e);
      if (id) this.focusOn(id);
    });
    let pending = null;
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      pending = e;
      if (this._hoverRaf) return;
      this._hoverRaf = requestAnimationFrame(() => {
        this._hoverRaf = null;
        const id = this.pick(pending);
        if (id !== this.hovered) {
          this.hovered = id;
          el.style.cursor = id ? 'pointer' : '';
          this.#applyHighlights();
          this.#emit('hover', id ? this.components.get(id) : null, pending);
        } else if (id) {
          this.#emit('hover', this.components.get(id), pending);
        }
      });
    });
    el.addEventListener('pointerleave', () => {
      this.hovered = null;
      el.style.cursor = '';
      this.#applyHighlights();
      this.#emit('hover', null);
    });
  }

  pick(e) {
    if (!this.model) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = [];
    for (const c of this.components.values()) if (c.group.visible) targets.push(...c.meshes);
    const hits = this.raycaster.intersectObjects(targets, false);
    for (const h of hits) {
      if (this.section.enabled && this.clipPlane.distanceToPoint(h.point) < 0) continue;
      const id = h.object.userData.componentId;
      if (id) return id;
    }
    return null;
  }

  select(id, opts = {}) {
    if (id && !this.components.has(id)) return;
    this.selected = id;
    this.#applyHighlights();
    this.#emit('select', id ? this.components.get(id) : null, opts);
  }

  /** Kurzes farbiges Aufleuchten (Lernmodus-Feedback). */
  flashComponent(id, kind = 'hint', ms = 1600) {
    const color = kind === 'error' ? ERROR_COLOR : HINT_COLOR;
    this.flash.set(id, { color, until: performance.now() + ms });
    this.#applyHighlights();
  }

  setFocusMode(on) {
    this.focusMode = on;
    this.#applyHighlights();
  }

  #applyHighlights() {
    const now = performance.now();
    for (const c of this.components.values()) {
      const fl = this.flash.get(c.id);
      const flashing = fl && fl.until > now;
      if (fl && !flashing) this.flash.delete(c.id);
      let color = null;
      let intensity = 0;
      if (flashing) {
        color = fl.color;
        intensity = 0.55 + 0.35 * Math.sin(now / 90);
      } else if (c.id === this.selected) {
        color = SELECT_COLOR;
        intensity = 0.55;
      } else if (c.id === this.hovered) {
        color = HOVER_COLOR;
        intensity = 0.4;
      }
      const dim = this.focusMode && this.selected && c.id !== this.selected;
      for (const m of c.materials) {
        const o = m.userData.orig;
        if (m.emissive) {
          if (color) {
            m.emissive.copy(color);
            m.emissiveIntensity = intensity;
          } else {
            m.emissive.copy(o.emissive);
            m.emissiveIntensity = o.emissiveIntensity;
          }
        }
        if (dim) {
          m.transparent = true;
          m.opacity = Math.min(o.opacity, 0.12);
          m.depthWrite = false;
        } else {
          m.transparent = o.transparent;
          m.opacity = o.opacity;
          m.depthWrite = o.depthWrite;
        }
      }
      c.label.element.classList.toggle('selected', c.id === this.selected);
      c.label.element.classList.toggle('dim', !!dim);
    }
    this.dirty = true;
  }

  /* ------------------------------------------------------------ */
  /* Ansichten                                                     */
  /* ------------------------------------------------------------ */

  setExplode(f) {
    this.explode = f;
    const dist = 1.9;
    for (const c of this.components.values()) {
      c.group.position.copy(c.explodeDir).multiplyScalar(f * dist);
    }
    if (this.model) for (const a of this.model.auxiliary) a.visible = f < 0.02;
    this.dirty = true;
  }

  setHousingMode(mode) {
    this.housingMode = mode;
    if (!this.model) return;
    this.model.housing.visible = mode !== 'hidden';
    for (const m of this.housingMaterials) {
      const o = m.userData.orig;
      if (mode === 'ghost') {
        m.transparent = true;
        m.opacity = 0.13;
        m.depthWrite = false;
      } else {
        m.transparent = o.transparent;
        m.opacity = o.opacity;
        m.depthWrite = o.depthWrite;
      }
    }
    this.dirty = true;
  }

  /** Schnittdarstellung: axis 'x' | 'y' | 'z', value 0..1 relativ zur Gerätegröße. */
  setSection({ enabled, axis, value }) {
    this.section = { enabled, axis, value };
    if (!this.model) return;
    const b = this.deviceBox;
    const normal = { x: new THREE.Vector3(-1, 0, 0), y: new THREE.Vector3(0, -1, 0), z: new THREE.Vector3(0, 0, -1) }[axis];
    const min = b.min[axis];
    const max = b.max[axis];
    const pos = min + (max - min) * value;
    this.clipPlane.normal.copy(normal);
    this.clipPlane.constant = pos;
    const planes = enabled ? [this.clipPlane] : null;
    for (const m of this.allMaterials) {
      if (m.clippingPlanes !== planes) {
        m.clippingPlanes = planes;
        m.needsUpdate = true;
      }
    }
    this.#updateLabelVisibility();
  }

  setLabels(on) {
    this.labelsVisible = on;
    this.#updateLabelVisibility();
  }

  /** Beschriftungen weggeschnittener Bauteile ausblenden. */
  #updateLabelVisibility() {
    for (const c of this.components.values()) {
      const clipped = this.section.enabled && this.clipPlane.distanceToPoint(c.center) < 0;
      c.label.visible = this.labelsVisible && !clipped;
    }
    this.dirty = true;
  }

  /** Kamera so platzieren, dass das ganze Gerät sichtbar ist. */
  resetView(animate = true) {
    if (!this.model) return;
    const box = this.deviceBox;
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fov = Math.min(vFov, hFov);
    const dist = (radius / Math.sin(fov / 2)) * 0.82;
    const dir = (this.model.viewDir ?? new THREE.Vector3(0.62, 0.36, 0.7)).clone().normalize();
    this.#moveCamera(center.clone().addScaledVector(dir, dist), center, animate);
  }

  focusOn(id) {
    const c = this.components.get(id);
    if (!c) return;
    const box = new THREE.Box3().setFromObject(c.group);
    const center = box.getCenter(new THREE.Vector3());
    const size = Math.max(box.getSize(new THREE.Vector3()).length(), 0.6);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const dist = Math.max(size * 1.9, 2.4);
    this.#moveCamera(center.clone().addScaledVector(dir, dist), center, true);
  }

  #moveCamera(pos, target, animate) {
    if (!animate) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      this.dirty = true;
      return;
    }
    this.camAnim = {
      fromPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toPos: pos,
      toTarget: target,
      t: 0,
    };
  }

  addTicker(fn) {
    this.tickers.add(fn);
    return () => this.tickers.delete(fn);
  }

  requestRender() {
    this.dirty = true;
  }

  #loop() {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    if (this.camAnim) {
      const a = this.camAnim;
      a.t = Math.min(1, a.t + dt / 0.7);
      const k = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
      this.camera.position.lerpVectors(a.fromPos, a.toPos, k);
      this.controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
      if (a.t >= 1) this.camAnim = null;
      this.dirty = true;
    }
    this.controls.update();
    let active = false;
    for (const fn of this.tickers) if (fn(dt) !== false) active = true;
    if (this.flash.size) {
      this.#applyHighlights();
      active = true;
    }
    if (this.dirty || active) {
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  }
}
