import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCycle, sampleState, sampleCurve, o2Fraction, DEFAULT_PARAMS } from '../src/devices/ventilator/simulation.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('Zeiten aus Atemfrequenz und I:E', () => {
  const c = computeCycle({ ...DEFAULT_PARAMS, rr: 15, ie: 2 });
  close(c.T, 4);
  close(c.ti, 4 / 3);
  close(c.te, 8 / 3);
});

test('FiO₂-Mischung: 21 % → nur Luft, 100 % → nur O₂', () => {
  close(o2Fraction(0.21), 0);
  close(o2Fraction(1), 1);
  close(o2Fraction(0.4), 0.19 / 0.79);
});

test('Bewegungsgleichung: Ppeak = PEEP + V/C + R·Flow (vollständige Exspiration)', () => {
  const p = { ...DEFAULT_PARAMS };
  const c = computeCycle(p);
  assert.ok(c.expComplete);
  const expected = p.peep + (c.v0 + p.vt) / p.compliance + p.resistance * (p.vt / 1000 / c.ti);
  close(c.pPeak, expected);
  assert.ok(c.peepi < 0.1);
});

test('Inspiriertes Volumen am Ende der Inspiration = Vt', () => {
  const p = { ...DEFAULT_PARAMS };
  const c = computeCycle(p);
  const end = sampleState(p, c, c.ti - 1e-9);
  close(end.volume - c.v0, p.vt, 1e-3);
});

test('Exspiration: Paw = PEEP, Flow negativ, exponentieller Abfall', () => {
  const p = { ...DEFAULT_PARAMS };
  const c = computeCycle(p);
  const s = sampleState(p, c, c.ti + c.tau);
  assert.equal(s.phase, 'exp');
  close(s.pressure, p.peep);
  assert.ok(s.flow < 0);
  close(s.volume, (c.v0 + p.vt) * Math.exp(-1), 1e-6);
});

test('Auto-PEEP bei hoher Resistance und kurzer Exspiration', () => {
  const p = { ...DEFAULT_PARAMS, resistance: 30, compliance: 60, rr: 22, ie: 1.5 };
  const c = computeCycle(p);
  assert.ok(!c.expComplete);
  assert.ok(c.peepi > 1);
  // eingeschwungener Zustand: Endvolumen der Exspiration = Startvolumen der Inspiration
  const endExp = sampleState(p, c, c.T - 1e-9).volume;
  close(endExp, c.v0, 1e-3);
});

test('Kurve ist geschlossen und endlich', () => {
  const p = { ...DEFAULT_PARAMS };
  const c = computeCycle(p);
  const curve = sampleCurve(p, c, 100);
  assert.equal(curve.length, 101);
  for (const s of curve) for (const k of ['pressure', 'flow', 'volume']) assert.ok(Number.isFinite(s[k]));
});
