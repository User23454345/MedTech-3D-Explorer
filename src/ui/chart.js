/**
 * Zeichnet Beatmungskurven (Druck, Flow, Volumen über die Zeit) auf ein
 * 2D-Canvas. Wird für das Kurvenpanel und das virtuelle Gerätedisplay genutzt.
 */

export const TRACES = [
  { key: 'pressure', label: 'Paw', unit: 'mbar', color: '#facc15', range: (c) => [0, Math.max(30, Math.ceil(c.pPeak / 10) * 10)] },
  { key: 'flow', label: 'Flow', unit: 'L/min', color: '#22d3ee', range: (c, curve) => symRange(curve, 'flow', 60) },
  { key: 'volume', label: 'Vol', unit: 'ml', color: '#a78bfa', range: (c) => [0, Math.max(600, Math.ceil((c.v0 + c.vt) / 200) * 200)] },
];

function symRange(curve, key, min) {
  let m = min;
  for (const s of curve) m = Math.max(m, Math.abs(s[key]));
  m = Math.ceil(m / 20) * 20;
  return [-m, m];
}

/**
 * @param ctx      CanvasRenderingContext2D
 * @param area     {x, y, w, h}
 * @param curve    Array aus sampleCurve()
 * @param cycle    computeCycle()-Ergebnis (+ vt)
 * @param cursorT  aktuelle Zeit im Zyklus (s) oder null
 */
export function drawWaveforms(ctx, area, curve, cycle, cursorT, opts = {}) {
  const { font = 12, grid = 'rgba(148,163,184,0.18)', text = '#cbd5e1', phaseShade = true } = opts;
  const rowH = area.h / TRACES.length;
  const T = cycle.T;
  ctx.save();
  ctx.font = `${font}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';

  TRACES.forEach((tr, i) => {
    const y0 = area.y + i * rowH;
    const pad = font * 0.6;
    const top = y0 + pad;
    const bottom = y0 + rowH - pad;
    const [lo, hi] = tr.range(cycle, curve);
    const yOf = (v) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
    const xOf = (t) => area.x + (t / T) * area.w;

    if (phaseShade) {
      ctx.fillStyle = 'rgba(59,130,246,0.08)';
      ctx.fillRect(area.x, top, (cycle.ti / T) * area.w, bottom - top);
      ctx.fillStyle = 'rgba(249,115,22,0.06)';
      ctx.fillRect(xOf(cycle.ti), top, area.w - (cycle.ti / T) * area.w, bottom - top);
    }
    // Nulllinie / Raster
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const zeroY = yOf(Math.max(lo, 0));
    ctx.moveTo(area.x, zeroY);
    ctx.lineTo(area.x + area.w, zeroY);
    ctx.stroke();

    ctx.fillStyle = tr.color;
    ctx.fillText(`${tr.label} [${tr.unit}]`, area.x + 4, top);
    ctx.fillStyle = text;
    ctx.globalAlpha = 0.7;
    ctx.fillText(String(hi), area.x + area.w - ctx.measureText(String(hi)).width - 4, top);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = tr.color;
    ctx.lineWidth = Math.max(1.5, font / 7);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    curve.forEach((s, k) => {
      const x = xOf(s.t);
      const y = yOf(s[tr.key]);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    if (cursorT != null) {
      const x = xOf(cursorT);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      // Punkt
      const idx = Math.min(curve.length - 1, Math.round((cursorT / T) * (curve.length - 1)));
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, yOf(curve[idx][tr.key]), font / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}
