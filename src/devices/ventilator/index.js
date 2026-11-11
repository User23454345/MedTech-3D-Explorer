import { COMPONENTS, GROUPS } from './components.js';
import { buildVentilatorModel } from './model.js';
import { VentilatorAnimation } from './animation.js';
import { TASKS } from './tasks.js';
import { PARAM_LIMITS, DEFAULT_PARAMS } from './simulation.js';

export default {
  id: 'beatmungsgeraet',
  name: 'Beatmungsgerät',
  untertitel: 'Intensivrespirator mit zentraler Gasversorgung (ventilgesteuert) – volumenkontrollierte Beatmung',
  darstellung: 'schematisch',
  components: COMPONENTS,
  groups: GROUPS,
  tasks: TASKS,
  params: { limits: PARAM_LIMITS, defaults: DEFAULT_PARAMS },
  presets: [
    { name: 'Normale Lunge', values: { ...DEFAULT_PARAMS } },
    {
      name: 'Steife Lunge (niedrige Compliance)',
      note: 'Gleiches Volumen erfordert deutlich höheren Druck (z. B. bei ARDS).',
      values: { ...DEFAULT_PARAMS, compliance: 20, vt: 400, peep: 10, rr: 20, fio2: 0.6 },
    },
    {
      name: 'Atemwegsobstruktion (hohe Resistance)',
      note: 'Großes τ = R·C: Die Ausatmung reicht nicht aus – es entsteht Auto-PEEP.',
      values: { ...DEFAULT_PARAMS, resistance: 30, compliance: 60, rr: 22, ie: 1.5 },
    },
  ],
  build: buildVentilatorModel,
  createAnimation: (viewer, model) => new VentilatorAnimation(viewer, model),
  legend: [
    { color: '#3b82f6', text: 'Sauerstoff (O₂)' },
    { color: '#e2e8f0', text: 'Druckluft' },
    { color: '#93c5fd', text: 'Gemisch (Farbe nach FiO₂)' },
    { color: '#fb923c', text: 'Ausatemgas (CO₂-angereichert)' },
    { color: '#facc15', text: 'Sensorsignal → Steuerung' },
    { color: '#e879f9', text: 'Stellsignal → Aktor' },
    { color: '#22d3ee', text: 'Daten Display' },
    { color: '#f87171', text: 'Energieversorgung' },
  ],
};
