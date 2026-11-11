/**
 * Ein-Kompartiment-Lungenmodell für volumenkontrollierte Beatmung (VC-CMV)
 * mit konstantem inspiratorischem Flow und passiver Exspiration.
 *
 * Bewegungsgleichung:  Paw = V / C + R · V̇ + PEEP
 *
 *  - Inspiration (0 ≤ t < Ti): V̇ = Vt / Ti (konstant)
 *  - Exspiration (Ti ≤ t < T): passiv, V(t) = V_endinsp · e^(−t/τ), τ = R · C
 *    Das Exspirationsventil hält den Druck am Y-Stück auf PEEP, deshalb ist
 *    Paw in der Exspiration (idealisiert) = PEEP.
 *  - Ist Te zu kurz für eine vollständige Ausatmung (Te < ~3τ), bleibt
 *    Volumen in der Lunge zurück → intrinsischer PEEP (Auto-PEEP). Im
 *    eingeschwungenen Zustand gilt V0 = Vt · k / (1 − k) mit k = e^(−Te/τ).
 *
 * Vereinfachungen (bewusst, didaktisch): keine Schlauchcompliance, keine
 * Leckage, keine Spontanatmung, idealer Sensor-/Ventilverlauf, keine
 * inspiratorische Pause.
 *
 * Einheiten: Volumen ml, Druck mbar, Flow L/min (intern L/s), Zeit s,
 * C in ml/mbar, R in mbar/(L/s).
 */

export const DEFAULT_PARAMS = Object.freeze({
  rr: 15, // Atemfrequenz [1/min]
  vt: 500, // Tidalvolumen [ml]
  peep: 5, // [mbar]
  ie: 2, // I:E = 1 : ie
  fio2: 0.4, // 0.21–1.0
  compliance: 50, // [ml/mbar]
  resistance: 10, // [mbar/(L/s)]
});

export const PARAM_LIMITS = Object.freeze({
  rr: { min: 6, max: 35, step: 1, unit: '/min', label: 'Atemfrequenz' },
  vt: { min: 250, max: 800, step: 10, unit: 'ml', label: 'Tidalvolumen' },
  peep: { min: 0, max: 20, step: 1, unit: 'mbar', label: 'PEEP' },
  ie: { min: 1, max: 4, step: 0.5, unit: '', label: 'I:E (1 : x)' },
  fio2: { min: 0.21, max: 1, step: 0.01, unit: '', label: 'FiO₂' },
  compliance: { min: 10, max: 100, step: 1, unit: 'ml/mbar', label: 'Compliance' },
  resistance: { min: 2, max: 40, step: 1, unit: 'mbar/(L/s)', label: 'Resistance' },
});

/** Anteil des Gesamtflows aus der O₂-Leitung für eine gewünschte FiO₂. */
export function o2Fraction(fio2) {
  return Math.min(1, Math.max(0, (fio2 - 0.21) / 0.79));
}

export function computeCycle(p) {
  const T = 60 / p.rr;
  const ti = T / (1 + p.ie);
  const te = T - ti;
  const tau = (p.resistance * p.compliance) / 1000; // s
  const flowInsp = p.vt / 1000 / ti; // L/s
  const k = Math.exp(-te / tau);
  const v0 = (p.vt * k) / (1 - k); // eingeschlossenes Volumen [ml]
  const peepi = v0 / p.compliance; // intrinsischer PEEP [mbar]
  const vEndInsp = v0 + p.vt;
  const pPeak = p.peep + vEndInsp / p.compliance + p.resistance * flowInsp;
  const pPlat = p.peep + vEndInsp / p.compliance;
  return {
    T,
    ti,
    te,
    tau,
    flowInsp, // L/s
    flowInspLmin: flowInsp * 60,
    v0,
    peepi,
    pPeak,
    pPlat,
    drivingPressure: p.vt / p.compliance,
    mv: (p.vt * p.rr) / 1000, // L/min
    expComplete: te >= 3 * tau,
    o2Share: o2Fraction(p.fio2),
  };
}

/**
 * Zustand zum Zeitpunkt t (beliebig, wird auf den Zyklus abgebildet).
 * volume = Volumen über dem endexspiratorischen Ruhevolumen bei PEEP.
 */
export function sampleState(p, cycle, t) {
  const tc = ((t % cycle.T) + cycle.T) % cycle.T;
  if (tc < cycle.ti) {
    const volume = cycle.v0 + cycle.flowInsp * 1000 * tc;
    return {
      phase: 'insp',
      tc,
      phaseProgress: tc / cycle.ti,
      volume,
      flow: cycle.flowInsp * 60, // L/min
      pressure: p.peep + volume / p.compliance + p.resistance * cycle.flowInsp,
    };
  }
  const te = tc - cycle.ti;
  const vEnd = cycle.v0 + p.vt;
  const volume = vEnd * Math.exp(-te / cycle.tau);
  const flowLs = -volume / 1000 / cycle.tau;
  return {
    phase: 'exp',
    tc,
    phaseProgress: te / cycle.te,
    volume,
    flow: flowLs * 60,
    pressure: p.peep,
    alveolarPressure: p.peep + volume / p.compliance,
  };
}

/** Diskrete Kurve eines Atemzyklus für die Diagrammdarstellung. */
export function sampleCurve(p, cycle, n = 240) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * cycle.T * 0.99999;
    out.push({ t, ...sampleState(p, cycle, t) });
  }
  return out;
}
