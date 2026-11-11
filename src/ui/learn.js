/**
 * Lernmodus: führt Aufgaben aus der Gerätedefinition aus.
 * Klick-Aufgaben übernehmen dafür die Auswahl im 3D-Viewer (viewer.pickHandler).
 */
import { el, shuffle } from './dom.js';

const STORE_KEY = 'medtech3d.progress';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}
function saveProgress(p) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    /* privat-Modus o. Ä. */
  }
}

export class LearnMode {
  constructor({ viewer, device, container, onActiveChange }) {
    this.viewer = viewer;
    this.device = device;
    this.container = container;
    this.onActiveChange = onActiveChange || (() => {});
    this.byId = Object.fromEntries(device.components.map((c) => [c.id, c]));
    this.progress = loadProgress();
    this.renderList();
  }

  key(task) {
    return `${this.device.id}:${task.id}`;
  }

  name(id) {
    return this.byId[id]?.name ?? id;
  }

  stop() {
    this.viewer.pickHandler = null;
    this.active = null;
    this.onActiveChange(null);
  }

  renderList() {
    this.stop();
    const tasks = this.device.tasks;
    const done = tasks.filter((t) => this.progress[this.key(t)]?.done).length;
    const list = el('div', { class: 'task-list' });
    for (const t of tasks) {
      const p = this.progress[this.key(t)];
      list.append(
        el(
          'button',
          { class: 'task-card' + (p?.done ? ' done' : ''), onclick: () => this.start(t) },
          el('div', { class: 'task-head' }, el('span', { class: 'level' }, t.level), p?.done ? el('span', { class: 'check' }, `✓ ${p.score ?? ''}`) : ''),
          el('div', { class: 'task-title' }, t.title),
          el('div', { class: 'task-intro' }, t.intro),
        ),
      );
    }
    this.container.replaceChildren(
      el('div', { class: 'learn-head' },
        el('h3', {}, 'Lernmodus'),
        el('div', { class: 'progress' },
          el('div', { class: 'bar' }, el('div', { class: 'fill', style: `width:${(done / tasks.length) * 100}%` })),
          el('span', {}, `${done} / ${tasks.length} gelöst`),
        ),
      ),
      list,
      el('button', { class: 'link-btn', onclick: () => { this.progress = {}; saveProgress(this.progress); this.renderList(); } }, 'Fortschritt zurücksetzen'),
    );
  }

  finish(task, score, extra) {
    this.progress[this.key(task)] = { done: true, score };
    saveProgress(this.progress);
    this.viewer.pickHandler = null;
    this.body.append(
      el('div', { class: 'result ok' },
        el('strong', {}, `Aufgabe gelöst – ${score}`),
        task.explain ? el('p', {}, task.explain) : '',
        extra || '',
      ),
      el('div', { class: 'row' },
        el('button', { class: 'btn', onclick: () => this.start(task) }, 'Wiederholen'),
        el('button', { class: 'btn primary', onclick: () => this.renderList() }, 'Zur Aufgabenliste'),
      ),
    );
  }

  start(task) {
    this.stop();
    this.active = task;
    this.onActiveChange(task);
    this.status = el('div', { class: 'task-status' });
    this.body = el('div', { class: 'task-body' });
    this.container.replaceChildren(
      el('button', { class: 'link-btn', onclick: () => this.renderList() }, '← Aufgaben'),
      el('div', { class: 'task-run' },
        el('span', { class: 'level' }, task.level),
        el('h3', {}, task.title),
        el('p', {}, task.intro),
        this.status,
        this.body,
      ),
    );
    this[`run_${task.type}`](task);
  }

  setStatus(text, kind = '') {
    this.status.className = `task-status ${kind}`;
    this.status.textContent = text;
  }

  /* --- find ------------------------------------------------------ */
  run_find(task) {
    let tries = 0;
    this.setStatus('Klicke auf das gesuchte Bauteil im 3D-Modell.');
    const hintBtn = el('button', { class: 'btn', onclick: () => { this.setStatus(task.hint, 'hint'); } }, 'Hinweis');
    const showBtn = el('button', { class: 'btn', onclick: () => { this.viewer.flashComponent(task.target, 'hint', 3000); this.viewer.focusOn(task.target); tries += 3; } }, 'Zeigen');
    this.body.append(el('div', { class: 'row' }, hintBtn, showBtn));
    this.viewer.pickHandler = (id) => {
      if (!id) return false;
      tries++;
      if (id === task.target) {
        this.viewer.flashComponent(id, 'hint', 1500);
        this.viewer.select(id);
        this.setStatus(`Richtig: ${this.name(id)}`, 'ok');
        this.body.replaceChildren();
        this.finish(task, tries === 1 ? '1. Versuch ★★★' : tries <= 3 ? `${tries} Versuche ★★` : `${tries} Versuche ★`);
      } else {
        this.viewer.flashComponent(id, 'error', 900);
        this.setStatus(`Das ist: ${this.name(id)} – versuche es noch einmal.`, 'err');
        if (tries === 3) this.setStatus(task.hint, 'hint');
      }
      return false;
    };
  }

  /* --- identify -------------------------------------------------- */
  run_identify(task) {
    const pool = this.device.components.filter((c) => (task.pool === 'kern' ? c.kern : true));
    const targets = shuffle(pool).slice(0, task.count);
    let i = 0;
    let correct = 0;
    let wrongOnCurrent = 0;
    const counter = el('div', { class: 'counter' });
    const skip = el('button', { class: 'btn', onclick: () => next(false) }, 'Überspringen (zeigen)');
    this.body.append(counter, el('div', { class: 'row' }, skip));
    const ask = () => {
      counter.textContent = `Bauteil ${i + 1} von ${targets.length} · ${correct} richtig`;
      this.setStatus(`Finde: ${targets[i].name}`);
      wrongOnCurrent = 0;
    };
    const next = (ok) => {
      const t = targets[i];
      if (ok) correct++;
      else {
        this.viewer.flashComponent(t.id, 'hint', 1800);
      }
      i++;
      if (i >= targets.length) {
        this.viewer.pickHandler = null;
        this.body.replaceChildren();
        this.setStatus(`${correct} von ${targets.length} beim ersten Versuch gefunden.`, correct === targets.length ? 'ok' : 'hint');
        this.finish(task, `${correct}/${targets.length}`);
        return;
      }
      ask();
    };
    this.viewer.pickHandler = (id) => {
      if (!id) return false;
      const t = targets[i];
      if (id === t.id) {
        this.viewer.flashComponent(id, 'hint', 900);
        next(wrongOnCurrent === 0);
      } else {
        wrongOnCurrent++;
        this.viewer.flashComponent(id, 'error', 900);
        this.setStatus(`Nein, das ist: ${this.name(id)}. Gesucht: ${t.name}`, 'err');
        if (wrongOnCurrent >= 3) next(false);
      }
      return false;
    };
    ask();
  }

  /* --- match ----------------------------------------------------- */
  run_match(task) {
    const options = shuffle(task.pairs.map((p) => p.id));
    const rows = shuffle(task.pairs).map((p) => {
      const select = el('select', {},
        el('option', { value: '' }, '– Bauteil wählen –'),
        ...options.map((id) => el('option', { value: id }, this.byId[id].kurz)),
      );
      const mark = el('span', { class: 'mark' });
      return { p, select, mark, row: el('div', { class: 'match-row' }, el('div', { class: 'fn' }, p.fn), el('div', { class: 'sel' }, select, mark)) };
    });
    const check = el('button', {
      class: 'btn primary',
      onclick: () => {
        let ok = 0;
        for (const r of rows) {
          const right = r.select.value === r.p.id;
          if (right) ok++;
          r.row.classList.toggle('right', right);
          r.row.classList.toggle('wrong', !right);
          r.mark.textContent = right ? '✓' : `✗ ${this.byId[r.p.id].kurz}`;
          if (!right) r.mark.title = 'Richtige Lösung';
        }
        this.setStatus(`${ok} von ${rows.length} richtig zugeordnet.`, ok === rows.length ? 'ok' : 'hint');
        if (ok === rows.length || this.matchTries++ >= 1) {
          check.disabled = true;
          this.finish(task, `${ok}/${rows.length}`);
        }
      },
    }, 'Prüfen');
    this.matchTries = 0;
    this.setStatus('Wähle zu jeder Funktion das passende Bauteil. Du hast zwei Prüfversuche.');
    this.body.append(...rows.map((r) => r.row), el('div', { class: 'row' }, check));
    // Hover im Modell zeigt Namen, Klick bewirkt nichts
    this.viewer.pickHandler = (id) => {
      if (id) this.viewer.flashComponent(id, 'hint', 600);
      return false;
    };
  }

  /* --- sequence -------------------------------------------------- */
  run_sequence(task) {
    let step = 0;
    let errors = 0;
    const trail = el('ol', { class: 'trail' });
    this.body.append(trail);
    const expect = () => task.steps[step].map((id) => this.byId[id].kurz).join(' oder ');
    this.setStatus(`Schritt 1 von ${task.steps.length}: Wo beginnt der Weg?`);
    const showBtn = el('button', {
      class: 'btn',
      onclick: () => {
        errors++;
        task.steps[step].forEach((id) => this.viewer.flashComponent(id, 'hint', 2000));
        this.setStatus(`Nächste Station: ${expect()}`, 'hint');
      },
    }, 'Nächste Station zeigen');
    this.body.append(el('div', { class: 'row' }, showBtn));
    this.viewer.pickHandler = (id) => {
      if (!id) return false;
      if (task.steps[step].includes(id)) {
        this.viewer.flashComponent(id, 'hint', 1200);
        trail.append(el('li', { class: 'ok' }, this.name(id)));
        step++;
        if (step >= task.steps.length) {
          this.viewer.pickHandler = null;
          showBtn.remove();
          this.setStatus(errors === 0 ? 'Perfekt – Weg vollständig ohne Fehler verfolgt!' : `Weg vollständig – ${errors} Fehler/Hilfen.`, 'ok');
          this.finish(task, errors === 0 ? '★★★' : errors <= 2 ? '★★' : '★');
        } else {
          this.setStatus(`Richtig! Schritt ${step + 1} von ${task.steps.length}: Wohin geht es weiter?`, 'ok');
        }
      } else if (task.optional.includes(id)) {
        this.viewer.flashComponent(id, 'hint', 700);
        trail.append(el('li', { class: 'opt' }, `${this.name(id)} (liegt auf dem Weg)`));
        this.setStatus(`${this.byId[id].kurz} liegt auf dem Weg – gesucht ist die nächste Hauptstation.`, 'hint');
      } else {
        errors++;
        this.viewer.flashComponent(id, 'error', 900);
        this.setStatus(`${this.byId[id].kurz} gehört hier nicht hin.`, 'err');
      }
      return false;
    };
  }

  /* --- order ----------------------------------------------------- */
  run_order(task) {
    let order = shuffle(task.items.map((text, i) => ({ text, i })));
    while (order.every((o, k) => o.i === k)) order = shuffle(order);
    const list = el('ol', { class: 'order-list' });
    const render = () => {
      list.replaceChildren(
        ...order.map((o, k) =>
          el('li', { class: 'order-item' },
            el('span', { class: 'txt' }, o.text),
            el('span', { class: 'moves' },
              el('button', { class: 'mini', 'aria-label': 'nach oben', disabled: k === 0, onclick: () => { [order[k - 1], order[k]] = [order[k], order[k - 1]]; render(); } }, '▲'),
              el('button', { class: 'mini', 'aria-label': 'nach unten', disabled: k === order.length - 1, onclick: () => { [order[k + 1], order[k]] = [order[k], order[k + 1]]; render(); } }, '▼'),
            ),
          ),
        ),
      );
    };
    render();
    let tries = 0;
    const check = el('button', {
      class: 'btn primary',
      onclick: () => {
        tries++;
        const items = [...list.children];
        let ok = 0;
        order.forEach((o, k) => {
          const right = o.i === k;
          if (right) ok++;
          items[k].classList.toggle('right', right);
          items[k].classList.toggle('wrong', !right);
        });
        if (ok === order.length) {
          check.disabled = true;
          this.setStatus('Reihenfolge korrekt!', 'ok');
          const ta = el('textarea', { rows: 5, placeholder: 'Erkläre den Ablauf in eigenen Worten …' });
          const model = el('div', { class: 'model-answer hidden' }, el('strong', {}, 'Musterlösung: '), task.model);
          this.finish(task, tries === 1 ? '1. Versuch ★★★' : `${tries} Versuche`, el('div', { class: 'explain-box' },
            el('label', {}, 'Selbstcheck: Erkläre den Ablauf'),
            ta,
            el('button', { class: 'btn', onclick: () => model.classList.remove('hidden') }, 'Musterlösung anzeigen'),
            model,
          ));
        } else {
          this.setStatus(`${ok} von ${order.length} Schritten an der richtigen Position. Rot markierte verschieben.`, 'hint');
        }
      },
    }, 'Prüfen');
    this.setStatus('Mit ▲/▼ sortieren, dann prüfen.');
    this.body.append(list, el('div', { class: 'row' }, check));
  }
}
