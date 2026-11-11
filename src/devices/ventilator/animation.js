import * as THREE from 'three';
import { computeCycle, sampleState, sampleCurve, DEFAULT_PARAMS } from './simulation.js';
import { drawWaveforms } from '../../ui/chart.js';

const COLORS = {
  o2: new THREE.Color('#3b82f6'),
  air: new THREE.Color('#e2e8f0'),
  exp: new THREE.Color('#fb923c'),
};
const GOLDEN = 0.6180339887;
const PMAX_ALARM = 40; // mbar – Beispiel-Alarmgrenze „Paw hoch“

/**
 * Funktionsanimation des Beatmungsgeräts:
 *  - Gasfluss (Partikel) für O₂, Druckluft, Inspiration und Exspiration
 *  - Regelkreis (Signalimpulse auf Sensor-/Aktorleitungen)
 *  - Ventil- und Lungenbewegung, Live-Display
 * Alle Größen stammen aus dem Ein-Kompartiment-Modell (simulation.js).
 */
export class VentilatorAnimation {
  constructor(viewer, model) {
    this.viewer = viewer;
    this.model = model;
    this.params = { ...DEFAULT_PARAMS };
    this.playing = false;
    this.speed = 0.6;
    this.mode = 'gas'; // 'gas' | 'signal' | 'both'
    this.t = 0;
    this.listeners = [];
    this.lastScreen = 0;
    this.group = new THREE.Group();
    this.group.name = 'animation';
    model.root.add(this.group);

    this.#buildParticles();
    this.#buildPulses();
    this.setParams(this.params);
    this.#apply(sampleState(this.params, this.cycle, 0), 0);
    this.group.visible = false;
    this.unsub = viewer.addTicker((dt) => this.#tick(dt));
  }

  onUpdate(fn) {
    this.listeners.push(fn);
  }

  setParams(p) {
    this.params = { ...this.params, ...p };
    this.cycle = { ...computeCycle(this.params), vt: this.params.vt };
    this.curve = sampleCurve(this.params, this.cycle);
    this.t = this.t % this.cycle.T;
    this.#updateDensities();
    this.#drawScreen(true);
    this.#notify(sampleState(this.params, this.cycle, this.t));
    this.viewer.requestRender();
  }

  setMode(mode) {
    this.mode = mode;
    this.#updateVisibility();
    this.viewer.requestRender();
  }

  setSpeed(s) {
    this.speed = s;
  }

  play() {
    this.playing = true;
    this.#updateVisibility();
  }

  pause() {
    this.playing = false;
    this.#updateVisibility();
    this.viewer.requestRender();
  }

  /** Animation sichtbar machen ohne abzuspielen (z. B. Pause-Standbild). */
  show(on) {
    this.visible = on;
    this.#updateVisibility();
    this.viewer.requestRender();
  }

  step(seconds) {
    this.t = (this.t + seconds + this.cycle.T) % this.cycle.T;
    this.#frame(0);
  }

  dispose() {
    this.unsub?.();
    this.model.root.remove(this.group);
  }

  /* ---------------------------------------------------------- */

  #buildParticles() {
    const geo = new THREE.SphereGeometry(0.045, 8, 6);
    this.streams = {};
    for (const [key, path] of Object.entries(this.model.flowPaths)) {
      const len = path.getLength();
      const n = Math.max(12, Math.round(len / 0.11));
      const mat = new THREE.MeshBasicMaterial({ color: key === 'exp' ? COLORS.exp : key === 'o2' ? COLORS.o2 : COLORS.air, toneMapped: false });
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      // Partikelpositionen entlang der Kurve vorab tabellieren (performant)
      const table = new Float32Array(401 * 3);
      for (let i = 0; i <= 400; i++) {
        const p = path.getPointAt(i / 400);
        table.set([p.x, p.y, p.z], i * 3);
      }
      const offsets = Array.from({ length: n }, (_, i) => (i * GOLDEN) % 1);
      this.streams[key] = { mesh, len, n, table, offsets, s: 0, speed: 0 };
      this.group.add(mesh);
    }
  }

  #buildPulses() {
    const geo = new THREE.SphereGeometry(0.05, 10, 8);
    this.pulses = this.model.wires.list.map((w, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: w.color, toneMapped: false });
      const per = 3;
      const mesh = new THREE.InstancedMesh(geo, mat, per);
      mesh.frustumCulled = false;
      const pts = w.curve.getSpacedPoints(120);
      this.group.add(mesh);
      return { wire: w, mesh, pts, per, s: (i * 0.37) % 1, active: false };
    });
  }

  #updateDensities() {
    const share = this.cycle.o2Share;
    const st = this.streams;
    st.o2.mesh.count = Math.round(st.o2.n * share);
    st.air.mesh.count = Math.round(st.air.n * (1 - share));
    st.insp.mesh.material.color.copy(COLORS.air).lerp(COLORS.o2, share);
  }

  #updateVisibility() {
    const show = Boolean(this.playing || this.visible);
    this.group.visible = show && this.viewer.explode < 0.02;
    const gas = this.mode !== 'signal';
    const sig = this.mode !== 'gas';
    for (const s of Object.values(this.streams)) s.mesh.visible = gas;
    for (const p of this.pulses) p.mesh.visible = sig && p.active;
  }

  #tick(dt) {
    if (!this.playing) return false;
    this.t = (this.t + dt * this.speed) % this.cycle.T;
    this.#frame(dt * this.speed);
    return true;
  }

  #frame(simDt) {
    const state = sampleState(this.params, this.cycle, this.t);
    this.#apply(state, simDt);
    this.#updateVisibility();
    this.#drawScreen(false);
    this.#notify(state);
    this.viewer.requestRender();
  }

  #notify(state) {
    const info = { state, cycle: this.cycle, params: this.params, curve: this.curve, t: this.t, alarms: this.alarms() };
    this.listeners.forEach((fn) => fn(info));
  }

  alarms() {
    const out = [];
    if (this.cycle.pPeak > PMAX_ALARM)
      out.push({ prio: 'hoch', text: `Paw hoch (> ${PMAX_ALARM} mbar)` });
    if (this.cycle.peepi > 1)
      out.push({ prio: 'mittel', text: `Auto-PEEP ≈ ${this.cycle.peepi.toFixed(1)} mbar` });
    return out;
  }

  #apply(state, simDt) {
    const c = this.cycle;
    const insp = state.phase === 'insp';
    const vis = 1.5; // Einheiten/s bei Referenzflow
    const refFlow = 30; // L/min

    // Partikelgeschwindigkeiten (∝ Flow, mit Mindestsichtbarkeit)
    const flowAbs = Math.abs(state.flow);
    const fv = Math.min(2.2, Math.max(0.15, flowAbs / refFlow)) * vis;
    const speeds = {
      o2: insp ? fv : 0,
      air: insp ? fv : 0,
      insp: insp ? fv : 0,
      exp: !insp && flowAbs > 0.6 ? fv : 0,
    };
    const m4 = new THREE.Matrix4();
    for (const [key, s] of Object.entries(this.streams)) {
      s.speed = speeds[key];
      s.s = (s.s + (simDt * s.speed) / s.len) % 1;
      const active = s.speed > 0;
      const scale = active ? 1 : 0;
      for (let i = 0; i < s.mesh.count; i++) {
        const u = (s.offsets[i] + s.s) % 1;
        const idx = Math.floor(u * 400) * 3;
        m4.makeScale(scale, scale, scale);
        m4.setPosition(s.table[idx], s.table[idx + 1], s.table[idx + 2]);
        s.mesh.setMatrixAt(i, m4);
      }
      s.mesh.instanceMatrix.needsUpdate = true;
    }

    // Signalimpulse
    for (const p of this.pulses) {
      const w = p.wire;
      let active = w.type === 'sensor' || w.type === 'power' || w.type === 'data';
      if (w.to === 'prop_valves') active = insp;
      if (w.to === 'exp_valve') active = true;
      if (w.to === 'alarm') active = this.alarms().length > 0;
      p.active = active;
      const rate = w.type === 'sensor' ? 0.9 : w.type === 'power' ? 0.35 : 0.6;
      p.s = (p.s + simDt * rate) % 1;
      for (let i = 0; i < p.per; i++) {
        const u = (p.s + i / p.per) % 1;
        const pt = p.pts[Math.floor(u * (p.pts.length - 1))];
        const sc = active ? 1 : 0;
        m4.makeScale(sc, sc, sc);
        m4.setPosition(pt);
        p.mesh.setMatrixAt(i, m4);
      }
      p.mesh.instanceMatrix.needsUpdate = true;
    }

    // Ventile
    const r = this.model.refs;
    const share = c.o2Share;
    const ramp = insp ? Math.min(1, state.phaseProgress * 12) : Math.max(0, 1 - state.phaseProgress * 25);
    if (r.o2Rod) r.o2Rod.position.y = r.o2Rod.userData.baseY + 0.1 * ramp * Math.max(share, 0.05);
    if (r.airRod) r.airRod.position.y = r.airRod.userData.baseY + 0.1 * ramp * Math.max(1 - share, 0.05);
    if (r.expMembrane) {
      const open = insp ? 0 : Math.min(1, flowAbs / 40);
      r.expMembrane.position.y = r.expMembrane.userData.baseY + 0.06 * open;
    }
    // Lunge
    if (r.lung) {
      const k = 0.8 + 0.5 * Math.min(1.3, state.volume / 700);
      r.lung.scale.set(k, k, k);
    }
    // Alarm-LED
    if (r.alarmLed) {
      const al = this.alarms();
      const mat = r.alarmLed.material;
      if (al.length && this.playing) {
        const high = al.some((a) => a.prio === 'hoch');
        mat.emissive.set(high ? '#ef4444' : '#facc15');
        mat.color.set(high ? '#fca5a5' : '#fef08a');
        const blink = Math.sin(performance.now() / (high ? 120 : 260)) > 0;
        mat.emissiveIntensity = blink ? 1.6 : 0.2;
      } else {
        mat.emissive.set('#ef4444');
        mat.color.set('#fca5a5');
        mat.emissiveIntensity = 0.15;
      }
      mat.userData.orig.emissive.copy(mat.emissive);
      mat.userData.orig.emissiveIntensity = mat.emissiveIntensity;
    }
  }

  #drawScreen(force) {
    const now = performance.now();
    if (!force && now - this.lastScreen < 80) return;
    this.lastScreen = now;
    const { canvas, texture } = this.model.screen;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, W, 40);
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('VC-CMV', 14, 20);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Lehrmodell · Simulation', 120, 20);
    const al = this.alarms();
    if (al.length) {
      const high = al.some((a) => a.prio === 'hoch');
      ctx.fillStyle = high ? '#dc2626' : '#ca8a04';
      ctx.fillRect(W - 250, 6, 240, 28);
      ctx.fillStyle = '#fff';
      ctx.fillText(al[0].text, W - 242, 20);
    }
    drawWaveforms(ctx, { x: 10, y: 48, w: 430, h: H - 56 }, this.curve, this.cycle, this.playing || this.visible ? this.t : null, {
      font: 15,
    });
    const s = sampleState(this.params, this.cycle, this.t);
    const vals = [
      ['Ppeak', this.cycle.pPeak.toFixed(0), 'mbar', '#facc15'],
      ['PEEP', this.params.peep.toFixed(0), 'mbar', '#facc15'],
      ['VT', this.params.vt.toFixed(0), 'ml', '#a78bfa'],
      ['MV', this.cycle.mv.toFixed(1), 'L/min', '#a78bfa'],
      ['f', this.params.rr.toFixed(0), '/min', '#e2e8f0'],
      ['FiO₂', (this.params.fio2 * 100).toFixed(0), '%', '#60a5fa'],
    ];
    vals.forEach(([k, v, u, col], i) => {
      const x = 455 + (i % 2) * 92;
      const y = 60 + Math.floor(i / 2) * 105;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(k, x, y + 6);
      ctx.fillStyle = col;
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText(v, x, y + 42);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(u, x, y + 72);
    });
    ctx.fillStyle = s.phase === 'insp' ? '#3b82f6' : '#f97316';
    ctx.fillRect(0, H - 6, W * (this.t / this.cycle.T), 6);
    texture.needsUpdate = true;
  }
}
