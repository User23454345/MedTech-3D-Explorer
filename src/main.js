import './styles.css';
import { Viewer } from './core/viewer.js';
import { componentThumbnail, clearThumbnailCache } from './core/thumbnails.js';
import { CATALOG } from './devices/catalog.js';
import { LearnMode } from './ui/learn.js';
import { drawWaveforms } from './ui/chart.js';
import { el } from './ui/dom.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const stage = $('#stage');

const state = {
  device: null,
  model: null,
  animation: null,
  learn: null,
  tab: 'parts',
  playing: false,
  animMode: 'gas',
  speed: 0.6,
  lastInfo: null,
};

const viewer = new Viewer($('#viewport'));
window.__viewer = viewer; // für Tests/Debugging

/* ================================================================== */
/* Bibliothek                                                           */
/* ================================================================== */

function renderLibrary() {
  const nav = $('#device-list');
  nav.replaceChildren(
    ...CATALOG.map((d) =>
      el('button', { class: 'device-btn', 'data-id': d.id, onclick: () => { location.hash = d.id; if (window.innerWidth <= 980) app.classList.add('lib-collapsed'); } },
        el('span', { class: 'mono', style: `background:${d.color}` }, d.mono),
        el('span', { class: 'meta' }, el('div', { class: 'nm' }, d.name), el('div', { class: 'sb' }, d.sub)),
        el('span', { class: 'status-pill' + (d.status === 'interaktiv' ? ' live' : '') }, d.status === 'interaktiv' ? '3D' : 'geplant'),
      ),
    ),
  );
}

function markActive(id) {
  document.querySelectorAll('.device-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
}

async function route() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, '')) || 'beatmungsgeraet';
  const entry = CATALOG.find((d) => d.id === id) || CATALOG[0];
  markActive(entry.id);
  if (entry.status !== 'interaktiv') return showPlaceholder(entry);
  $('#loading').hidden = false;
  const mod = await entry.load();
  await loadDevice(mod.default, entry);
  $('#loading').hidden = true;
}

function showPlaceholder(entry) {
  teardownDevice();
  state.device = null;
  viewer.unloadDevice();
  stage.classList.add('is-placeholder');
  $('#toolbar').hidden = true;
  $('#badge-schematic').hidden = true;
  $('#loading').hidden = true;
  $('#device-title').innerHTML = `<strong>${entry.name}</strong> · ${entry.sub}`;
  const ph = $('#placeholder');
  ph.hidden = false;
  ph.replaceChildren(
    el('div', { class: 'card' },
      el('div', { class: 'row', style: 'align-items:center;gap:14px;margin:0' },
        el('div', { class: 'mono-big', style: `background:${entry.color}` }, entry.mono),
        el('div', {}, el('span', { class: 'status-pill' }, '3D-Modell in Planung'), el('h2', {}, entry.name), el('div', { class: 'muted' }, entry.sub)),
      ),
      el('p', {}, entry.summary),
      el('h3', {}, 'Didaktisch relevante Hauptkomponenten'),
      el('ul', {}, ...entry.komponenten.map((k) => el('li', {}, k))),
      el('h3', {}, 'Geplante Funktionsanimation'),
      el('p', {}, entry.animation),
      el('p', { class: 'note' }, 'Die Komponentenliste beschreibt den allgemein dokumentierten Aufbau der Geräteklasse. Das 3D-Modell wird – wie beim Beatmungsgerät – als gekennzeichnetes schematisches Lehrmodell umgesetzt.'),
      el('div', { class: 'row' }, el('button', { class: 'btn primary', onclick: () => (location.hash = 'beatmungsgeraet') }, 'Zum interaktiven Beatmungsgerät')),
    ),
  );
  const empty = (t) => el('div', { class: 'empty' }, t);
  $('#tab-parts').replaceChildren(empty('Für dieses Gerät ist noch kein 3D-Modell verfügbar.'));
  $('#tab-details').replaceChildren(empty('–'));
  $('#tab-function').replaceChildren(empty(entry.animation));
  $('#tab-learn').replaceChildren(empty('Lernaufgaben folgen mit dem 3D-Modell.'));
}

function teardownDevice() {
  state.animation?.dispose();
  state.animation = null;
  state.learn?.stop();
  state.learn = null;
  setPlaying(false);
  $('#caption').hidden = true;
  $('#learn-banner').hidden = true;
}

/* ================================================================== */
/* Gerät laden                                                          */
/* ================================================================== */

async function loadDevice(device, entry) {
  teardownDevice();
  clearThumbnailCache();
  stage.classList.remove('is-placeholder');
  $('#placeholder').hidden = true;
  $('#toolbar').hidden = false;
  $('#badge-schematic').hidden = false;
  state.device = device;
  $('#device-title').innerHTML = `<strong>${device.name}</strong> · ${device.untertitel}`;

  const model = device.build();
  state.model = model;
  viewer.loadDevice(model, device.components);
  // Werkzeugzustand übernehmen
  viewer.setHousingMode(document.querySelector('#seg-housing .on').dataset.v);
  $('#rng-explode').value = 0;
  viewer.setSection(currentSection());
  viewer.setLabels($('#chk-labels').checked);
  viewer.setFocusMode($('#chk-focus').checked);

  state.animation = device.createAnimation(viewer, model);
  state.animation.setMode(state.animMode);
  state.animation.setSpeed(state.speed);
  state.animation.onUpdate(onAnimUpdate);

  renderParts();
  renderDetails(null);
  renderFunction();
  state.learn = new LearnMode({
    viewer,
    device,
    container: $('#tab-learn'),
    onActiveChange: (task) => {
      const b = $('#learn-banner');
      b.hidden = !task;
      if (task) b.textContent = `Lernmodus: ${task.title}`;
    },
  });
  setTab(state.tab);
}

/* ================================================================== */
/* Tabs                                                                 */
/* ================================================================== */

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  for (const t of ['parts', 'details', 'function', 'learn']) $(`#tab-${t}`).hidden = t !== tab;
  if (tab !== 'learn' && state.learn?.active) state.learn.renderList();
}
document.querySelectorAll('.tabs button').forEach((b) =>
  b.addEventListener('click', () => {
    setTab(b.dataset.tab);
    app.classList.remove('panel-collapsed');
  }),
);

/* ---------- Bauteile ---------- */
function renderParts() {
  const d = state.device;
  const container = $('#tab-parts');
  const search = el('input', { class: 'search', type: 'search', placeholder: 'Bauteil suchen …', 'aria-label': 'Bauteil suchen' });
  const list = el('div');
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    list.replaceChildren();
    for (const [gid, g] of Object.entries(d.groups)) {
      const items = d.components
        .map((c, i) => ({ c, n: i + 1 }))
        .filter(({ c }) => c.gruppe === gid && (!q || c.name.toLowerCase().includes(q) || c.begriffe.some((b) => b.term.toLowerCase().includes(q))));
      if (!items.length) continue;
      list.append(
        el('div', { class: 'part-group' },
          el('div', { class: 'part-group-title' }, el('span', { class: 'dot', style: `background:${g.color}` }), g.name),
          ...items.map(({ c, n }) =>
            el('button', { class: 'part-btn' + (viewer.selected === c.id ? ' on' : ''), 'data-id': c.id, onclick: () => { viewer.select(c.id, { source: 'list' }); } },
              el('span', { class: 'n' }, n),
              el('span', {}, c.name),
              c.kern ? el('span', { class: 'star', title: 'Kernkomponente' }, '★') : '',
            ),
          ),
        ),
      );
    }
    if (!list.children.length) list.append(el('div', { class: 'empty' }, 'Kein Bauteil gefunden.'));
  };
  search.addEventListener('input', draw);
  draw();
  container.replaceChildren(
    el('p', { class: 'muted', style: 'font-size:.82rem' }, `${d.components.length} erklärte Komponenten · ★ = Kernkomponente. Klick wählt das Bauteil im Modell aus.`),
    search,
    list,
  );
}

/* ---------- Details ---------- */
function renderDetails(comp) {
  const c = $('#tab-details');
  if (!comp) {
    c.replaceChildren(el('div', { class: 'empty' }, 'Wähle ein Bauteil im 3D-Modell oder in der Liste „Bauteile“ aus, um Funktion, Technik, Physik, Verbindungen, Fehlerbilder und Fachbegriffe zu sehen.'));
    return;
  }
  const d = comp.data;
  const g = state.device.groups[d.gruppe];
  const byId = Object.fromEntries(state.device.components.map((x) => [x.id, x]));
  const img = el('img', { class: 'detail-img', alt: `3D-Ansicht: ${d.name}` });
  // Thumbnail asynchron erzeugen, damit der Panelwechsel sofort erfolgt
  requestAnimationFrame(() => { img.src = componentThumbnail(`${state.device.id}:${d.id}`, comp.group); });

  c.replaceChildren(
    el('div', { class: 'detail-head' }, el('span', { class: 'n' }, comp.index), el('div', {}, el('h3', {}, d.name))),
    el('div', { class: 'tags' },
      el('span', { class: 'tag', style: `border-color:${g.color};color:${g.color}` }, g.name),
      el('span', { class: 'tag schem', title: 'Vereinfachte, herstellerunabhängige Darstellung' }, 'Darstellung: schematisch'),
      d.kern ? el('span', { class: 'tag' }, '★ Kernkomponente') : '',
    ),
    img,
    el('div', { class: 'img-cap' }, 'Bild: isolierte Ansicht aus dem schematischen 3D-Modell'),
    d.hinweis ? el('p', { class: 'note' }, d.hinweis) : '',
    el('div', { class: 'row' },
      el('button', { class: 'btn', onclick: () => viewer.focusOn(d.id) }, 'Fokussieren'),
      el('button', { class: 'btn' + (viewer.focusMode ? ' on' : ''), onclick: (e) => { const on = !viewer.focusMode; $('#chk-focus').checked = on; viewer.setFocusMode(on); e.target.classList.toggle('on', on); } }, 'Andere abdunkeln'),
    ),
    el('h4', {}, 'Funktion'),
    el('p', {}, d.funktion),
    el('h4', {}, 'Technische Erklärung'),
    el('p', {}, d.technik),
    el('h4', {}, 'Physikalisches Prinzip'),
    d.formel ? el('div', { class: 'formula' }, d.formel) : '',
    el('p', {}, d.prinzip),
    el('h4', {}, 'Verbindung zu anderen Komponenten'),
    el('div', { class: 'chips' },
      ...d.verbindungen.map((v) =>
        el('button', { class: 'chip', onclick: () => viewer.select(v.id, { source: 'link' }) }, el('small', {}, `${v.art} `), byId[v.id]?.kurz ?? v.id),
      ),
    ),
    el('h4', {}, 'Typische Fehlerbilder'),
    el('ul', { class: 'faults' }, ...d.fehler.map((f) => el('li', {}, f))),
    el('h4', {}, 'Fachbegriffe'),
    el('dl', { class: 'terms' }, ...d.begriffe.flatMap((b) => [el('dt', {}, b.term), el('dd', {}, b.def)])),
  );
  c.scrollTop = 0;
}

viewer.on('select', (comp, opts) => {
  document.querySelectorAll('.part-btn').forEach((b) => b.classList.toggle('on', comp && b.dataset.id === comp.id));
  if (!state.device) return;
  renderDetails(comp);
  if (comp && opts?.source !== 'learn' && !state.learn?.active) {
    if (state.tab !== 'function') setTab('details');
  }
});

/* ---------- Tooltip ---------- */
const tooltip = $('#tooltip');
viewer.on('hover', (comp, e) => {
  if (!comp || !e) {
    tooltip.hidden = true;
    return;
  }
  const r = stage.getBoundingClientRect();
  const learnActive = state.learn?.active && ['find', 'identify', 'sequence'].includes(state.learn.active.type);
  tooltip.innerHTML = learnActive ? '<small>Klicken zum Auswählen</small>' : `${comp.data.name}<small>${state.device.groups[comp.data.gruppe].name} · Klick für Details</small>`;
  tooltip.hidden = false;
  tooltip.style.left = `${Math.min(e.clientX - r.left + 14, r.width - 270)}px`;
  tooltip.style.top = `${e.clientY - r.top + 14}px`;
});

/* ================================================================== */
/* Funktion / Animation                                                 */
/* ================================================================== */

function renderFunction() {
  const d = state.device;
  const anim = state.animation;
  const c = $('#tab-function');
  const sliders = {};
  const fmt = (k, v) => (k === 'fio2' ? `${Math.round(v * 100)} %` : k === 'ie' ? `1 : ${v}` : `${v} ${d.params.limits[k].unit}`);

  const paramEls = Object.entries(d.params.limits).map(([k, lim]) => {
    const val = el('b', {}, fmt(k, anim.params[k]));
    const input = el('input', { type: 'range', min: lim.min, max: lim.max, step: lim.step, value: anim.params[k], 'aria-label': lim.label });
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      val.textContent = fmt(k, v);
      anim.setParams({ [k]: v });
    });
    sliders[k] = { input, val };
    return el('div', { class: 'param' }, el('label', {}, el('span', {}, lim.label), val), input);
  });

  const setValues = (vals) => {
    anim.setParams(vals);
    for (const [k, s] of Object.entries(sliders)) {
      s.input.value = anim.params[k];
      s.val.textContent = fmt(k, anim.params[k]);
    }
  };

  const modeSeg = el('div', { class: 'seg' },
    ...[['gas', 'Gasfluss'], ['signal', 'Regelkreis'], ['both', 'Beides']].map(([v, t]) =>
      el('button', { 'data-v': v, class: state.animMode === v ? 'on' : '', onclick: (e) => {
        state.animMode = v;
        anim.setMode(v);
        modeSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target));
        if (!state.playing) setPlaying(true);
      } }, t),
    ),
  );
  const speedSeg = el('div', { class: 'seg' },
    ...[[0.25, '0,25×'], [0.6, '0,6×'], [1, '1×']].map(([v, t]) =>
      el('button', { class: state.speed === v ? 'on' : '', onclick: (e) => {
        state.speed = v;
        anim.setSpeed(v);
        speedSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target));
      } }, t),
    ),
  );

  state.kv = el('div', { class: 'kv' });
  state.alarmBox = el('div');

  c.replaceChildren(
    el('h3', {}, 'Funktionsanimation'),
    el('p', { class: 'muted', style: 'font-size:.84rem' }, 'Volumenkontrollierte Beatmung (VC-CMV) an einer Ein-Kompartiment-Testlunge. Gasfluss, Ventilbewegung, Lungenfüllung und Kurven werden aus derselben physikalischen Simulation berechnet.'),
    el('div', { class: 'row' },
      el('button', { class: 'btn primary', id: 'fn-play', onclick: () => setPlaying(!state.playing) }, state.playing ? 'Pause' : 'Animation starten'),
      el('button', { class: 'btn', title: 'Einzelschritt (0,1 s)', onclick: () => { anim.show(true); showAnimUi(true); anim.step(0.1); } }, '+0,1 s'),
    ),
    el('div', { class: 'row', style: 'align-items:center' }, el('span', { class: 'tool-label' }, 'Darstellung'), modeSeg),
    el('div', { class: 'row', style: 'align-items:center' }, el('span', { class: 'tool-label' }, 'Tempo'), speedSeg),
    el('h4', {}, 'Szenarien'),
    el('div', { class: 'presets' },
      ...d.presets.map((p) => el('button', { class: 'btn', onclick: () => { setValues(p.values); if (!state.playing) setPlaying(true); } }, p.name, p.note ? el('small', {}, p.note) : '')),
    ),
    el('h4', {}, 'Einstellungen & Lungenmechanik'),
    ...paramEls,
    el('h4', {}, 'Berechnete Werte'),
    state.kv,
    state.alarmBox,
    el('h4', {}, 'Legende'),
    el('div', { class: 'legend' }, ...d.legend.map((l) => el('div', {}, el('span', { class: 'dot', style: `background:${l.color}` }), l.text))),
    el('h4', {}, 'Modellgrenzen'),
    el('p', { class: 'note' }, 'Vereinfachtes Lehrmodell: Ein-Kompartiment-Lunge (Paw = V/C + R·V̇ + PEEP), konstanter Inspirationsflow, ideale Ventile, keine Schlauchcompliance, keine Leckage, keine Spontanatmung, keine inspiratorische Pause. Die Alarmgrenze „Paw hoch“ ist beispielhaft auf 40 mbar gesetzt. Nicht für klinische Entscheidungen.'),
  );
  updateKv(anim);
}

function updateKv(anim) {
  const cy = anim.cycle;
  const rows = [
    ['Atemzyklus T', `${cy.T.toFixed(2)} s`],
    ['Inspirationszeit Ti', `${cy.ti.toFixed(2)} s`],
    ['Exspirationszeit Te', `${cy.te.toFixed(2)} s`],
    ['Inspirationsflow', `${cy.flowInspLmin.toFixed(1)} L/min`],
    ['Spitzendruck Ppeak', `${cy.pPeak.toFixed(1)} mbar`],
    ['Plateaudruck (berechnet)', `${cy.pPlat.toFixed(1)} mbar`],
    ['Driving Pressure Vt/C', `${cy.drivingPressure.toFixed(1)} mbar`],
    ['Zeitkonstante τ = R·C', `${cy.tau.toFixed(2)} s`],
    ['Intrinsischer PEEP', `${cy.peepi.toFixed(1)} mbar`],
    ['Atemminutenvolumen', `${cy.mv.toFixed(1)} L/min`],
    ['O₂-Anteil am Flow', `${Math.round(cy.o2Share * 100)} %`],
  ];
  state.kv.replaceChildren(...rows.flatMap(([k, v]) => [el('span', {}, k), el('b', {}, v)]));
  const al = anim.alarms();
  state.alarmBox.replaceChildren(
    ...al.map((a) => el('div', { class: `alarm-line ${a.prio}` }, `Alarm (${a.prio}e Priorität): ${a.text}`)),
    !cy.expComplete ? el('p', { class: 'note', style: 'margin-top:6px' }, `Te (${cy.te.toFixed(2)} s) < 3·τ (${(3 * cy.tau).toFixed(2)} s): Die Ausatmung ist unvollständig – es bleibt Volumen in der Lunge (Auto-PEEP).`) : '',
  );
}

function setPlaying(on) {
  state.playing = on;
  $('#tool-play').classList.toggle('playing', on);
  const fnBtn = document.getElementById('fn-play');
  if (fnBtn) fnBtn.textContent = on ? 'Pause' : 'Animation starten';
  if (!state.animation) return;
  if (on) {
    if (viewer.explode > 0) {
      $('#rng-explode').value = 0;
      viewer.setExplode(0);
    }
    state.animation.play();
  } else state.animation.pause();
  showAnimUi(on || state.animation.visible);
}

function showAnimUi(on) {
  $('#chart-panel').hidden = !on;
  $('#caption').hidden = !on;
  stage.classList.toggle('chart-open', on);
  if (on) resizeChart();
}

const chartCanvas = $('#chart');
function resizeChart() {
  const r = chartCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  chartCanvas.width = Math.max(1, Math.round(r.width * dpr));
  chartCanvas.height = Math.max(1, Math.round(r.height * dpr));
  if (state.lastInfo) drawChart(state.lastInfo);
}
window.addEventListener('resize', () => !$('#chart-panel').hidden && resizeChart());

function drawChart(info) {
  const ctx = chartCanvas.getContext('2d');
  const dpr = chartCanvas.width / Math.max(1, chartCanvas.clientWidth);
  ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  drawWaveforms(ctx, { x: 0, y: 0, w: chartCanvas.width, h: chartCanvas.height }, info.curve, info.cycle, info.t, { font: 11 * dpr });
}

let lastKv = 0;
function onAnimUpdate(info) {
  state.lastInfo = info;
  if (!$('#chart-panel').hidden) drawChart(info);
  const s = info.state;
  const stats = [
    ['Phase', s.phase === 'insp' ? 'Inspiration' : 'Exspiration'],
    ['Paw', `${s.pressure.toFixed(1)} mbar`],
    ['Flow', `${s.flow.toFixed(1)} L/min`],
    ['Volumen', `${Math.round(s.volume)} ml`],
    ['Ppeak', `${info.cycle.pPeak.toFixed(1)} mbar`],
    ['PEEP', `${info.params.peep} mbar`],
  ];
  $('#chart-stats').replaceChildren(...stats.map(([k, v]) => el('div', {}, el('span', {}, k), el('b', {}, v))));
  updateCaption(info);
  const now = performance.now();
  if (state.kv && now - lastKv > 250) {
    lastKv = now;
    updateKv(state.animation);
  }
}

function updateCaption(info) {
  const cap = $('#caption');
  const { state: s, cycle: cy, params: p, alarms } = info;
  const o2 = Math.round(cy.o2Share * 100);
  const insp = s.phase === 'insp';
  const mode = state.animMode;
  let html;
  if (mode === 'signal') {
    html = insp
      ? `<span class="ph">Regelkreis · Inspiration</span>Der Flowsensor meldet den Istflow an die Steuereinheit; sie vergleicht ihn mit dem Sollflow (${cy.flowInspLmin.toFixed(0)} L/min) und stellt den Spulenstrom der Proportionalventile nach. Das Exspirationsventil wird geschlossen gehalten; der Drucksensor überwacht Paw.`
      : `<span class="ph">Regelkreis · Exspiration</span>Der Drucksensor meldet Paw; die Steuereinheit regelt die Aktorkraft des Exspirationsventils so, dass der PEEP (${p.peep} mbar) gehalten wird. Der exspiratorische Flowsensor misst das ausgeatmete Volumen.`;
  } else {
    html = insp
      ? `<span class="ph">Inspiration</span>Proportionalventile offen: ${o2} % des Flows aus der O₂-Leitung, ${100 - o2} % Druckluft → FiO₂ ${Math.round(p.fio2 * 100)} %. Konstanter Flow ${cy.flowInspLmin.toFixed(0)} L/min, Exspirationsventil geschlossen – Paw steigt auf ${cy.pPeak.toFixed(0)} mbar.`
      : `<span class="ph">Exspiration</span>Inspirationsventile zu, Exspirationsventil offen. Die Lunge entleert sich passiv (τ = R·C = ${cy.tau.toFixed(2)} s); das Ventil hält den PEEP von ${p.peep} mbar.`;
  }
  if (alarms.length) html += `<br>${alarms.map((a) => `<span class="alarm ${a.prio}">⚠ ${a.text}</span>`).join(' ')}`;
  cap.innerHTML = html;
  cap.classList.toggle('exp', !insp);
}

/* ================================================================== */
/* Werkzeugleiste                                                       */
/* ================================================================== */

function segment(id, fn) {
  const seg = $(id);
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    fn(b.dataset.v);
  });
}

function currentSection() {
  return {
    enabled: $('#chk-section').checked,
    axis: document.querySelector('#seg-axis .on').dataset.v,
    value: parseFloat($('#rng-section').value),
  };
}

$('#tool-reset').addEventListener('click', () => viewer.resetView());
segment('#seg-housing', (v) => viewer.setHousingMode(v));
segment('#seg-axis', () => viewer.setSection(currentSection()));
$('#chk-section').addEventListener('change', () => {
  $('#rng-section').disabled = !$('#chk-section').checked;
  viewer.setSection(currentSection());
});
$('#rng-section').addEventListener('input', () => viewer.setSection(currentSection()));
$('#rng-explode').addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  viewer.setExplode(v);
  if (v > 0.02) {
    if (state.playing) setPlaying(false);
    state.animation?.show(false);
    showAnimUi(false);
  }
});
$('#chk-labels').addEventListener('change', (e) => viewer.setLabels(e.target.checked));
$('#chk-focus').addEventListener('change', (e) => viewer.setFocusMode(e.target.checked));
$('#tool-play').addEventListener('click', () => setPlaying(!state.playing));

$('#btn-help').addEventListener('click', () => $('#dlg-help').showModal());
$('#btn-sources').addEventListener('click', () => $('#dlg-sources').showModal());
$('#btn-library').addEventListener('click', () => app.classList.toggle('lib-collapsed'));
$('#btn-panel').addEventListener('click', () => app.classList.toggle('panel-collapsed'));


window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, dialog') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!state.device || $('#placeholder').hidden === false) return;
  switch (e.key) {
    case 'r':
    case 'R':
      viewer.resetView();
      break;
    case ' ':
      e.preventDefault();
      setPlaying(!state.playing);
      break;
    case 'e':
    case 'E': {
      const r = $('#rng-explode');
      r.value = parseFloat(r.value) > 0 ? 0 : 1;
      r.dispatchEvent(new Event('input'));
      break;
    }
    case 's':
    case 'S':
      $('#chk-section').click();
      break;
    case 'Escape':
      viewer.select(null);
      break;
  }
});

// Startzustand: auf schmalen Bildschirmen Bibliothek eingeklappt
if (window.innerWidth <= 980) app.classList.add('lib-collapsed');

renderLibrary();
window.addEventListener('hashchange', route);
route();
