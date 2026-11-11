import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { v3, roundedPath, joinCurves, tube, cylinderBetween, corrugatedTube } from '../../core/geometry.js';

/**
 * Prozedurales, SCHEMATISCHES 3D-Lehrmodell eines ventilgesteuerten
 * Intensiv-Beatmungsgeräts. Keine Herstellergeometrie.
 *
 * Koordinaten: x = rechts, y = oben, z = zum Betrachter (Gerätefront bei z = +1,3).
 * 1 Einheit ≈ 10 cm (nicht maßstabsgetreu).
 */

const std = (color, o = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...o });
const metal = (color = '#9aa4b1') => std(color, { roughness: 0.35, metalness: 0.65 });
const copper = () => std('#b87333', { roughness: 0.35, metalness: 0.7 });
const clear = (color, opacity = 0.45) =>
  std(color, { transparent: true, opacity, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide });

function mesh(geo, mat, pos, rot) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.copy(pos);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}

const cylZ = (r, len, mat, pos, seg = 20) => mesh(new THREE.CylinderGeometry(r, r, len, seg), mat, pos, [Math.PI / 2, 0, 0]);
const cylX = (r, len, mat, pos, seg = 20) => mesh(new THREE.CylinderGeometry(r, r, len, seg), mat, pos, [0, 0, Math.PI / 2]);
const cylY = (r, len, mat, pos, seg = 20) => mesh(new THREE.CylinderGeometry(r, r, len, seg), mat, pos);
const box = (w, h, d, mat, pos) => mesh(new THREE.BoxGeometry(w, h, d), mat, pos);

/* ------------------------------------------------------------------ */
/* Zentrale Punkte des Gaswegs                                         */
/* ------------------------------------------------------------------ */
const P = {
  o2Hose: v3(-1.5, 0.25, -2.7),
  o2In: v3(-1.5, 1.0, -1.75),
  airHose: v3(-0.7, 0.25, -2.7),
  airIn: v3(-0.7, 1.0, -1.75),
  manifold: v3(-1.1, 1.7, 0.3),
  inspPort: v3(1.3, 1.7, 1.3),
  inspFilterEnd: v3(1.3, 1.7, 1.95),
  yInsp: v3(1.88, 1.53, 3.2),
  yCenter: v3(2.2, 1.3, 3.2),
  yStem: v3(2.55, 1.3, 3.2),
  hmeEnd: v3(2.95, 1.3, 3.2),
  lung: v3(3.62, 1.3, 3.2),
  yExp: v3(1.88, 1.07, 3.2),
  expPortOuter: v3(1.3, 0.9, 1.75),
  expPort: v3(1.3, 0.9, 1.3),
  exhaust: v3(1.3, 0.9, -1.95),
};

function buildPaths() {
  const hose = (end, start) =>
    new THREE.CatmullRomCurve3([start, v3(start.x, 0.75, -2.35), v3(end.x, 1.0, -1.98), end]);
  const o2Hose = hose(P.o2In, P.o2Hose);
  const airHose = hose(P.airIn, P.airHose);
  const o2Internal = roundedPath([P.o2In, v3(-1.5, 1.0, 0.3), v3(-1.5, 1.7, 0.3), P.manifold], 0.15);
  const airInternal = roundedPath([P.airIn, v3(-0.7, 1.0, 0.3), v3(-0.7, 1.7, 0.3), P.manifold], 0.15);
  const inspInternal = roundedPath(
    [P.manifold, v3(-1.1, 2.15, 0.3), v3(1.3, 2.15, 0.3), v3(1.3, 1.7, 0.3), P.inspPort],
    0.15,
  );
  const inspFilter = new THREE.LineCurve3(P.inspPort, P.inspFilterEnd);
  const inspLimb = new THREE.CatmullRomCurve3([
    P.inspFilterEnd,
    v3(1.33, 1.78, 2.4),
    v3(1.52, 1.72, 2.88),
    v3(1.74, 1.6, 3.14),
    P.yInsp,
  ]);
  const inspY = roundedPath([P.yInsp, P.yCenter, P.lung], 0.06);
  const expY = roundedPath([P.lung, P.yCenter, P.yExp], 0.06);
  const expLimb = new THREE.CatmullRomCurve3([
    P.yExp,
    v3(1.72, 1.0, 3.12),
    v3(1.48, 0.93, 2.75),
    v3(1.33, 0.9, 2.25),
    P.expPortOuter,
  ]);
  const expInternal = new THREE.LineCurve3(P.expPortOuter, P.exhaust);

  return {
    curves: { o2Hose, airHose, o2Internal, airInternal, inspInternal, inspLimb, expLimb, expInternal },
    flow: {
      o2: joinCurves(o2Hose, o2Internal),
      air: joinCurves(airHose, airInternal),
      insp: joinCurves(inspInternal, inspFilter, inspLimb, inspY),
      exp: joinCurves(expY, expLimb, expInternal),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Komponenten                                                         */
/* ------------------------------------------------------------------ */

function gasInlet(color, ringColor, x, hoseCurve) {
  const g = new THREE.Group();
  const body = std(color, { roughness: 0.4 });
  const ring = std(ringColor);
  g.add(cylZ(0.11, 0.28, metal(), v3(x, 1.0, -1.42), 6)); // Sechskant
  g.add(cylZ(0.085, 0.22, body, v3(x, 1.0, -1.66)));
  g.add(cylZ(0.095, 0.05, ring, v3(x, 1.0, -1.6)));
  g.add(tube(hoseCurve, 0.06, std(color, { roughness: 0.7 })));
  // Codierungsring am Schlauchende
  g.add(cylZ(0.075, 0.08, ring, v3(x, 1.0, -1.86)));
  return g;
}

function regulators() {
  const g = new THREE.Group();
  for (const x of [-1.5, -0.7]) {
    g.add(cylZ(0.16, 0.42, metal('#aab3be'), v3(x, 1.0, -0.82)));
    g.add(cylY(0.15, 0.18, metal('#c2c9d2'), v3(x, 1.24, -0.82)));
    g.add(cylY(0.05, 0.12, metal('#6b7480'), v3(x, 1.39, -0.82), 10)); // Stellschraube
    g.add(cylZ(0.12, 0.16, std('#d6dbe1'), v3(x, 1.0, -1.16))); // Filter
  }
  return g;
}

function propValves(refs) {
  const g = new THREE.Group();
  const bodyMat = metal('#8d97a5');
  for (const [x, key] of [
    [-1.5, 'o2Rod'],
    [-0.7, 'airRod'],
  ]) {
    g.add(box(0.34, 0.3, 0.34, bodyMat, v3(x, 1.0, -0.1)));
    g.add(cylY(0.13, 0.3, copper(), v3(x, 1.3, -0.1)));
    g.add(cylY(0.14, 0.04, metal('#5b6572'), v3(x, 1.47, -0.1)));
    const rod = cylY(0.035, 0.18, std('#fbbf24', { emissive: '#7c5800', emissiveIntensity: 0.3 }), v3(x, 1.5, -0.1), 10);
    rod.userData.baseY = 1.5;
    refs[key] = rod;
    g.add(rod);
  }
  // Mischkammer
  g.add(mesh(new THREE.SphereGeometry(0.13, 18, 12), metal('#9aa4b1'), P.manifold));
  return g;
}

function o2Sensor() {
  const g = new THREE.Group();
  g.add(cylX(0.1, 0.3, std('#1d4ed8'), v3(-0.5, 2.15, 0.3)));
  g.add(cylY(0.13, 0.3, std('#2563eb'), v3(-0.5, 2.36, 0.3)));
  g.add(cylY(0.14, 0.06, std('#1e3a8a'), v3(-0.5, 2.54, 0.3)));
  g.add(cylY(0.04, 0.1, std('#111827'), v3(-0.5, 2.62, 0.3), 8));
  return g;
}

function inspFlow() {
  const g = new THREE.Group();
  const m = std('#60a5fa');
  g.add(cylX(0.12, 0.42, m, v3(0.1, 2.15, 0.3)));
  g.add(cylX(0.15, 0.05, metal(), v3(-0.1, 2.15, 0.3)));
  g.add(cylX(0.15, 0.05, metal(), v3(0.3, 2.15, 0.3)));
  g.add(box(0.22, 0.12, 0.18, std('#1f2937'), v3(0.1, 2.33, 0.3)));
  return g;
}

function safetyValve(refs) {
  const g = new THREE.Group();
  g.add(cylX(0.1, 0.24, metal('#9aa4b1'), v3(0.7, 2.15, 0.3)));
  g.add(cylY(0.12, 0.28, std('#ef4444'), v3(0.7, 2.36, 0.3)));
  const cap = mesh(new THREE.SphereGeometry(0.13, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#b91c1c'), v3(0.7, 2.5, 0.3));
  g.add(cap);
  // Feder (Helix) – sichtbar im Schnitt
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const a = (i / 80) * Math.PI * 8;
    pts.push(v3(0.7 + Math.cos(a) * 0.07, 2.27 + (i / 80) * 0.22, 0.3 + Math.sin(a) * 0.07));
  }
  g.add(tube(new THREE.CatmullRomCurve3(pts), 0.012, metal('#e5e7eb'), 60, 5));
  const disc = cylY(0.09, 0.025, metal('#374151'), v3(0.7, 2.25, 0.3));
  refs.safetyDisc = disc;
  g.add(disc);
  return g;
}

function pressureSensor() {
  const g = new THREE.Group();
  g.add(box(0.55, 0.12, 0.3, std('#0f766e'), v3(1.1, 2.85, -0.3)));
  for (const x of [0.95, 1.25]) {
    g.add(box(0.16, 0.08, 0.16, std('#111827'), v3(x, 2.77, -0.3)));
  }
  const lineMat = clear('#e0f2fe', 0.8);
  const l1 = roundedPath([v3(1.0, 2.15, 0.3), v3(1.0, 2.15, -0.3), v3(0.95, 2.6, -0.3), v3(0.95, 2.73, -0.3)], 0.08);
  const l2 = roundedPath(
    [v3(1.3, 0.9, 1.0), v3(1.78, 0.9, 1.0), v3(1.78, 2.5, 1.0), v3(1.78, 2.5, -0.3), v3(1.25, 2.5, -0.3), v3(1.25, 2.73, -0.3)],
    0.1,
  );
  g.add(tube(l1, 0.025, lineMat, 30, 6));
  g.add(tube(l2, 0.025, lineMat, 30, 6));
  return g;
}

function inspFilter() {
  const g = new THREE.Group();
  g.add(cylZ(0.07, 0.12, std('#e5e7eb'), v3(1.3, 1.7, 1.4)));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.08, 0.14, 24), clear('#dbeafe', 0.75), v3(1.3, 1.7, 1.52), [Math.PI / 2, 0, 0]));
  g.add(cylZ(0.22, 0.18, clear('#bfdbfe', 0.6), v3(1.3, 1.7, 1.68)));
  g.add(cylZ(0.205, 0.16, std('#f8fafc', { roughness: 0.9 }), v3(1.3, 1.7, 1.68)));
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.22, 0.14, 24), clear('#dbeafe', 0.75), v3(1.3, 1.7, 1.84), [Math.PI / 2, 0, 0]));
  return g;
}

function limb(curve, color) {
  return corrugatedTube(curve, 0.1, clear(color, 0.42), std(color, { transparent: true, opacity: 0.7 }));
}

function yPiece() {
  const g = new THREE.Group();
  const m = clear('#e9d5ff', 0.7);
  g.add(cylinderBetween(P.yInsp, P.yCenter, 0.11, m));
  g.add(cylinderBetween(P.yExp, P.yCenter, 0.11, m));
  g.add(cylinderBetween(P.yCenter, P.yStem, 0.11, m));
  g.add(mesh(new THREE.SphereGeometry(0.115, 16, 12), m, P.yCenter));
  return g;
}

function hme() {
  const g = new THREE.Group();
  g.add(cylX(0.05, 0.08, std('#e5e7eb'), v3(2.59, 1.3, 3.2)));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.06, 0.1, 24), clear('#fbcfe8', 0.7), v3(2.67, 1.3, 3.2), [0, 0, Math.PI / 2]));
  g.add(cylX(0.22, 0.16, clear('#fbcfe8', 0.55), v3(2.8, 1.3, 3.2)));
  g.add(cylX(0.2, 0.14, std('#fef3c7', { roughness: 0.95 }), v3(2.8, 1.3, 3.2)));
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.22, 0.1, 24), clear('#fbcfe8', 0.7), v3(2.93, 1.3, 3.2), [0, 0, Math.PI / 2]));
  return g;
}

function expFlow() {
  const g = new THREE.Group();
  g.add(cylZ(0.13, 0.4, std('#fb923c'), v3(1.3, 0.9, 0.6)));
  g.add(box(0.2, 0.14, 0.24, std('#1f2937'), v3(1.3, 1.08, 0.6)));
  // Hitzdraht (im Schnitt sichtbar)
  g.add(cylinderBetween(v3(1.3, 0.82, 0.6), v3(1.3, 0.98, 0.6), 0.008, std('#fde68a', { emissive: '#f59e0b', emissiveIntensity: 0.8 }), 6));
  return g;
}

function expValve(refs) {
  const g = new THREE.Group();
  g.add(cylZ(0.17, 0.38, std('#ea580c'), v3(1.3, 0.9, -0.2)));
  g.add(cylY(0.26, 0.12, std('#c2410c'), v3(1.3, 1.1, -0.2)));
  const membrane = cylY(0.22, 0.02, std('#fde68a'), v3(1.3, 1.07, -0.2));
  membrane.userData.baseY = 1.07;
  refs.expMembrane = membrane;
  g.add(membrane);
  g.add(cylY(0.13, 0.26, copper(), v3(1.3, 1.29, -0.2)));
  g.add(cylY(0.14, 0.04, metal('#5b6572'), v3(1.3, 1.44, -0.2)));
  return g;
}

function controlUnit() {
  const g = new THREE.Group();
  g.add(box(3.2, 0.05, 1.6, std('#166534', { roughness: 0.7 }), v3(0, 2.95, -0.15)));
  const chip = std('#111827', { roughness: 0.4 });
  g.add(box(0.42, 0.05, 0.42, chip, v3(-0.4, 3.0, -0.2)));
  g.add(box(0.26, 0.04, 0.2, chip, v3(0.25, 3.0, -0.5)));
  g.add(box(0.26, 0.04, 0.2, chip, v3(0.25, 3.0, 0.1)));
  g.add(box(0.3, 0.05, 0.3, chip, v3(-1.1, 3.0, -0.6))); // Überwachungsprozessor
  g.add(box(0.6, 0.08, 0.12, std('#e5e7eb'), v3(-0.2, 3.01, 0.5)));
  for (let i = 0; i < 6; i++) g.add(cylY(0.04, 0.1, std('#2563eb'), v3(-1.4 + i * 0.12, 3.02, 0.3), 10));
  return g;
}

function display() {
  const g = new THREE.Group();
  g.add(cylY(0.09, 0.5, metal('#6b7280'), v3(0, 3.55, -0.3)));
  const frame = new THREE.Group();
  frame.position.set(0, 4.75, -0.15);
  frame.rotation.x = -0.14;
  frame.add(new THREE.Mesh(new RoundedBoxGeometry(3.3, 2.1, 0.16, 3, 0.06), std('#334155')));
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.875), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.z = 0.085;
  frame.add(screen);
  // Drehknopf
  const knob = cylZ(0.12, 0.08, metal('#cbd5e1'), v3(1.45, -0.85, 0.1));
  frame.add(knob);
  g.add(frame);
  return { group: g, canvas, texture: tex };
}

function powerUnit() {
  const g = new THREE.Group();
  g.add(box(0.9, 0.42, 0.7, metal('#64748b'), v3(0.15, 0.68, -0.55)));
  for (let i = 0; i < 6; i++) g.add(box(0.03, 0.1, 0.62, metal('#94a3b8'), v3(-0.18 + i * 0.13, 0.94, -0.55)));
  g.add(box(0.8, 0.3, 0.5, std('#1e293b'), v3(0.15, 0.63, 0.45)));
  g.add(box(0.2, 0.08, 0.02, std('#22c55e', { emissive: '#16a34a', emissiveIntensity: 0.6 }), v3(0.15, 0.63, 0.71)));
  g.add(box(0.3, 0.2, 0.08, std('#0f172a'), v3(0.15, 0.7, -1.33))); // Kaltgerätebuchse
  return g;
}

function alarm(refs) {
  const g = new THREE.Group();
  g.add(cylZ(0.25, 0.18, std('#1f2937'), v3(-1.5, 2.5, 1.18)));
  g.add(cylZ(0.15, 0.1, metal('#9ca3af'), v3(-1.5, 2.5, 1.02)));
  const grill = std('#374151');
  for (let i = -2; i <= 2; i++) g.add(box(0.36 - Math.abs(i) * 0.06, 0.025, 0.02, grill, v3(-1.5, 2.5 + i * 0.07, 1.31)));
  const led = new THREE.Mesh(
    new RoundedBoxGeometry(1.6, 0.1, 0.12, 2, 0.04),
    std('#fca5a5', { emissive: '#ef4444', emissiveIntensity: 0.15, transparent: true, opacity: 0.95 }),
  );
  led.position.set(0, 5.88, -0.29);
  led.rotation.x = -0.14;
  refs.alarmLed = led;
  g.add(led);
  return g;
}

function testLung(refs) {
  const g = new THREE.Group();
  g.add(cylinderBetween(P.hmeEnd, v3(3.22, 1.3, 3.2), 0.06, std('#e5e7eb')));
  const bag = new THREE.Group();
  bag.position.copy(P.lung);
  const bagMesh = mesh(new THREE.SphereGeometry(0.42, 32, 20), std('#f472b6', { roughness: 0.45 }));
  bagMesh.scale.set(1, 1.2, 0.95);
  bag.add(bagMesh);
  bag.add(cylX(0.1, 0.16, std('#db2777'), v3(-0.42, 0, 0)));
  refs.lung = bag;
  g.add(bag);
  return g;
}

/* ------------------------------------------------------------------ */
/* Gehäuse, Leitungen, Signalleitungen                                 */
/* ------------------------------------------------------------------ */

function housing() {
  const g = new THREE.Group();
  const shell = std('#e7ebf0', { roughness: 0.6, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new RoundedBoxGeometry(4.2, 2.9, 2.6, 4, 0.14), shell);
  body.position.set(0, 1.85, 0);
  g.add(body);
  const dark = std('#475569');
  g.add(box(4.4, 0.12, 2.8, dark, v3(0, 0.34, 0)));
  for (const [x, z] of [
    [-1.9, -1.1],
    [1.9, -1.1],
    [-1.9, 1.1],
    [1.9, 1.1],
  ])
    g.add(cylY(0.13, 0.22, std('#1f2937'), v3(x, 0.17, z)));
  // Anschlussringe Front + Abgas Rückseite
  g.add(cylZ(0.17, 0.1, std('#2563eb'), v3(1.3, 1.7, 1.33)));
  g.add(cylZ(0.17, 0.1, std('#ea580c'), v3(1.3, 0.9, 1.33)));
  g.add(cylZ(0.11, 0.45, std('#cbd5e1'), v3(1.3, 0.9, 1.53)));
  g.add(cylZ(0.13, 0.12, std('#94a3b8'), v3(1.3, 0.9, -1.36)));
  g.add(cylZ(0.13, 0.12, std('#cbd5e1'), v3(-1.5, 1.0, -1.32)));
  g.add(cylZ(0.13, 0.12, std('#cbd5e1'), v3(-0.7, 1.0, -1.32)));
  return { group: g, shell: body };
}

function piping(curves) {
  const g = new THREE.Group();
  const m = clear('#94a3b8', 0.32);
  g.add(tube(curves.o2Internal, 0.055, m));
  g.add(tube(curves.airInternal, 0.055, m));
  g.add(tube(curves.inspInternal, 0.07, m));
  g.add(tube(curves.expInternal, 0.08, m));
  return g;
}

/** Signal- und Versorgungsleitungen (schematisch). */
function wires() {
  const defs = [
    { from: 'o2_sensor', type: 'sensor', pts: [v3(-0.5, 2.66, 0.3), v3(-0.5, 2.92, 0.3)] },
    { from: 'insp_flow', type: 'sensor', pts: [v3(0.1, 2.39, 0.3), v3(0.1, 2.92, 0.3)] },
    { from: 'pressure_sensor', type: 'sensor', pts: [v3(1.1, 2.91, -0.3), v3(1.1, 3.0, -0.3), v3(-0.2, 3.0, -0.3)] },
    { from: 'exp_flow', type: 'sensor', pts: [v3(1.4, 1.08, 0.6), v3(1.6, 1.08, 0.6), v3(1.6, 2.92, 0.6)] },
    { to: 'prop_valves', type: 'actuator', pts: [v3(-1.5, 2.92, -0.1), v3(-1.5, 1.49, -0.1)] },
    { to: 'prop_valves', type: 'actuator', pts: [v3(-0.7, 2.92, -0.1), v3(-0.7, 1.49, -0.1)] },
    { to: 'exp_valve', type: 'actuator', pts: [v3(0.8, 2.92, -0.2), v3(0.8, 1.6, -0.2), v3(1.3, 1.6, -0.2), v3(1.3, 1.46, -0.2)] },
    { to: 'alarm', type: 'actuator', pts: [v3(-1.5, 2.92, 0.7), v3(-1.5, 2.5, 0.7), v3(-1.5, 2.5, 1.08)] },
    { to: 'display', type: 'data', pts: [v3(0, 2.98, -0.7), v3(0, 3.4, -0.7), v3(0, 3.4, -0.3), v3(0, 3.8, -0.3)] },
    { from: 'power', type: 'power', pts: [v3(0.15, 0.9, -0.55), v3(0.15, 0.9, -0.95), v3(0.15, 2.92, -0.95)] },
  ];
  const g = new THREE.Group();
  const colors = { sensor: '#facc15', actuator: '#e879f9', data: '#22d3ee', power: '#f87171' };
  const list = defs.map((d) => {
    const curve = roundedPath(d.pts, 0.08);
    const m = tube(curve, 0.018, std(colors[d.type], { emissive: colors[d.type], emissiveIntensity: 0.25 }), 30, 6);
    g.add(m);
    return { ...d, curve, color: colors[d.type] };
  });
  return { group: g, list };
}

/* ------------------------------------------------------------------ */

export function buildVentilatorModel() {
  const root = new THREE.Group();
  root.name = 'Beatmungsgeraet';
  const refs = {};
  const { curves, flow } = buildPaths();

  const h = housing();
  root.add(h.group);

  const pipe = piping(curves);
  root.add(pipe);

  const wire = wires();
  root.add(wire.group);

  const disp = display();

  const parts = {
    o2_inlet: gasInlet('#f8fafc', '#e2e8f0', -1.5, curves.o2Hose),
    air_inlet: gasInlet('#1f2937', '#f8fafc', -0.7, curves.airHose),
    regulator: regulators(),
    prop_valves: propValves(refs),
    o2_sensor: o2Sensor(),
    insp_flow: inspFlow(),
    safety_valve: safetyValve(refs),
    pressure_sensor: pressureSensor(),
    insp_filter: inspFilter(),
    insp_limb: limb(curves.inspLimb, '#93c5fd'),
    y_piece: yPiece(),
    hme: hme(),
    exp_limb: limb(curves.expLimb, '#fdba74'),
    exp_flow: expFlow(),
    exp_valve: expValve(refs),
    control: controlUnit(),
    display: disp.group,
    power: powerUnit(),
    alarm: alarm(refs),
    lung: testLung(refs),
  };

  // Explosionsfaktoren: Patientenseite weniger stark auseinanderziehen
  const explodeScale = { insp_limb: 0.4, exp_limb: 0.4, y_piece: 0.6, hme: 0.7, lung: 0.8, display: 0.8, control: 1.2 };

  // Beschriftungspunkte für Bauteile, deren Hüllquader-Mitte ungünstig liegt
  const labelAt = {
    o2_inlet: v3(-1.5, 1.2, -1.7),
    air_inlet: v3(-0.7, 1.2, -1.7),
    regulator: v3(-1.1, 1.5, -0.82),
    pressure_sensor: v3(1.1, 2.98, -0.3),
    insp_limb: v3(1.45, 1.95, 2.6),
    exp_limb: v3(1.42, 1.12, 2.6),
    power: v3(0.15, 1.05, -0.2),
    alarm: v3(-1.5, 2.85, 1.25),
  };

  for (const [id, group] of Object.entries(parts)) {
    group.name = id;
    if (labelAt[id]) group.userData.labelAt = labelAt[id];
    group.userData.componentId = id;
    group.userData.explodeScale = explodeScale[id] ?? 1;
    root.add(group);
  }

  return {
    root,
    parts,
    housing: h.group,
    housingShell: h.shell,
    auxiliary: [pipe, wire.group],
    piping: pipe,
    wires: wire,
    flowPaths: flow,
    refs,
    screen: { canvas: disp.canvas, texture: disp.texture },
    viewDir: v3(0.62, 0.34, 0.72),
  };
}
