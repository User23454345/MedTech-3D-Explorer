import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS, GROUPS } from '../src/devices/ventilator/components.js';
import { TASKS } from '../src/devices/ventilator/tasks.js';

const ids = new Set(COMPONENTS.map((c) => c.id));

test('mindestens zehn erklärte Komponenten mit allen Pflichtfeldern', () => {
  assert.ok(COMPONENTS.length >= 10);
  for (const c of COMPONENTS) {
    for (const f of ['id', 'name', 'kurz', 'gruppe', 'funktion', 'technik', 'prinzip']) assert.ok(c[f], `${c.id}: ${f} fehlt`);
    assert.ok(GROUPS[c.gruppe], `${c.id}: unbekannte Gruppe`);
    assert.ok(c.verbindungen.length > 0, `${c.id}: keine Verbindungen`);
    assert.ok(c.fehler.length > 0, `${c.id}: keine Fehlerbilder`);
    assert.ok(c.begriffe.length > 0, `${c.id}: keine Fachbegriffe`);
  }
});

test('IDs sind eindeutig und Verbindungen verweisen auf existierende Bauteile', () => {
  assert.equal(ids.size, COMPONENTS.length);
  for (const c of COMPONENTS) for (const v of c.verbindungen) assert.ok(ids.has(v.id), `${c.id} → ${v.id}`);
});

test('Lernaufgaben referenzieren existierende Bauteile', () => {
  for (const t of TASKS) {
    const refs = [t.target, ...(t.pairs || []).map((p) => p.id), ...(t.steps || []).flat(), ...(t.optional || [])].filter(Boolean);
    for (const r of refs) assert.ok(ids.has(r), `${t.id}: ${r}`);
  }
});
