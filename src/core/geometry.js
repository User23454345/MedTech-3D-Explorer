import * as THREE from 'three';

export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Polylinie mit abgerundeten Ecken als CurvePath (für Leitungen/Rohre).
 * Die Kurve ist bogenlängenparametrisiert (getPointAt), damit Partikel
 * gleichmäßig wandern.
 */
export function roundedPath(points, radius = 0.12) {
  const path = new THREE.CurvePath();
  let prev = points[0].clone();
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const p = points[i];
    const b = points[i + 1];
    const d1 = p.clone().sub(a);
    const d2 = b.clone().sub(p);
    const r = Math.min(radius, d1.length() / 2, d2.length() / 2);
    const s = p.clone().sub(d1.normalize().multiplyScalar(r));
    const e = p.clone().add(d2.normalize().multiplyScalar(r));
    if (prev.distanceToSquared(s) > 1e-8) path.add(new THREE.LineCurve3(prev, s));
    path.add(new THREE.QuadraticBezierCurve3(s, p.clone(), e));
    prev = e;
  }
  const last = points[points.length - 1];
  if (prev.distanceToSquared(last) > 1e-8) path.add(new THREE.LineCurve3(prev, last.clone()));
  return path;
}

/** Verkettet mehrere Kurven zu einem CurvePath. */
export function joinCurves(...curves) {
  const path = new THREE.CurvePath();
  for (const c of curves) {
    if (c instanceof THREE.CurvePath) c.curves.forEach((cc) => path.add(cc));
    else path.add(c);
  }
  return path;
}

export function tube(curve, radius, material, segmentsPerUnit = 24, radial = 10) {
  const len = curve.getLength();
  const geo = new THREE.TubeGeometry(curve, Math.max(8, Math.round(len * segmentsPerUnit)), radius, radial, false);
  return new THREE.Mesh(geo, material);
}

/** Zylinder zwischen zwei Punkten. */
export function cylinderBetween(a, b, radius, material, radial = 16) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, radial);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

/** Riffelschlauch: Torus-Ringe entlang einer Kurve plus Grundschlauch. */
export function corrugatedTube(curve, radius, material, ringMaterial, spacing = 0.09) {
  const group = new THREE.Group();
  group.add(tube(curve, radius, material, 30, 12));
  const len = curve.getLength();
  const n = Math.floor(len / spacing);
  const ringGeo = new THREE.TorusGeometry(radius * 1.04, radius * 0.16, 6, 14);
  const inst = new THREE.InstancedMesh(ringGeo, ringMaterial, n);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const z = new THREE.Vector3(0, 0, 1);
  const s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    q.setFromUnitVectors(z, t);
    m.compose(p, q, s);
    inst.setMatrixAt(i, m);
  }
  group.add(inst);
  return group;
}
