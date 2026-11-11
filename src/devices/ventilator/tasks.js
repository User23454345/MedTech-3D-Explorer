/**
 * Lernaufgaben für das Beatmungsgerät.
 * Typen:
 *  find      – eine Komponente im 3D-Modell anklicken
 *  identify  – mehrere Komponenten nacheinander finden
 *  match     – Funktionen den Bauteilen zuordnen
 *  sequence  – Weg (Gas/Signal) in der richtigen Reihenfolge anklicken
 *  order     – Ablaufschritte in die richtige Reihenfolge bringen
 */
export const TASKS = [
  {
    id: 'find-pressure',
    type: 'find',
    title: 'Finde den Drucksensor',
    level: 'Einstieg',
    intro: 'Klicke im 3D-Modell auf den Sensor, der den Atemwegsdruck (Paw) misst.',
    target: 'pressure_sensor',
    hint: 'Er sitzt auf der Elektronikplatine und ist über dünne, durchsichtige Messleitungen mit dem In- und Exspirationsweg verbunden. Tipp: Gehäuse transparent stellen.',
    explain:
      'Der Drucksensor misst nicht direkt im Gasstrom, sondern über Druckmessleitungen. So bleibt die empfindliche Elektronik trocken und sauber – Kondenswasser in diesen Leitungen ist allerdings ein typisches Fehlerbild.',
  },
  {
    id: 'identify',
    type: 'identify',
    title: 'Identifiziere die wichtigsten Komponenten',
    level: 'Einstieg',
    intro: 'Finde nacheinander die angezeigten Komponenten im Modell.',
    count: 6,
    pool: 'kern',
  },
  {
    id: 'match',
    type: 'match',
    title: 'Ordne Bauteile den Funktionen zu',
    level: 'Fortgeschritten',
    intro: 'Wähle für jede Funktion das passende Bauteil aus.',
    pairs: [
      { fn: 'Hält am Ende der Ausatmung einen positiven Druck aufrecht.', id: 'exp_valve' },
      { fn: 'Misst die O₂-Konzentration im Einatemgas.', id: 'o2_sensor' },
      { fn: 'Reduziert den schwankenden Versorgungsdruck auf einen konstanten Arbeitsdruck.', id: 'regulator' },
      { fn: 'Dosiert O₂ und Druckluft und erzeugt den Inspirationsflow.', id: 'prop_valves' },
      { fn: 'Begrenzt den Druck mechanisch und ermöglicht bei Geräteausfall Spontanatmung.', id: 'safety_valve' },
      { fn: 'Misst das ausgeatmete Tidalvolumen (Vte).', id: 'exp_flow' },
      { fn: 'Speichert Wärme und Feuchtigkeit der Ausatemluft und gibt sie bei der Einatmung zurück.', id: 'hme' },
    ],
  },
  {
    id: 'trace-gas',
    type: 'sequence',
    title: 'Verfolge den Weg des Atemgases',
    level: 'Fortgeschritten',
    intro:
      'Klicke die Hauptstationen des Einatemgases in der richtigen Reihenfolge an – von der Gasversorgung bis zur Lunge. Sensoren und Filter auf dem Weg dürfen angeklickt werden, sind aber nicht erforderlich.',
    steps: [['o2_inlet', 'air_inlet'], ['regulator'], ['prop_valves'], ['insp_limb'], ['y_piece'], ['lung']],
    optional: ['o2_sensor', 'insp_flow', 'safety_valve', 'insp_filter', 'hme'],
    explain:
      'Gasversorgung → Druckregler (konstanter Arbeitsdruck) → Proportionalventile (Dosierung & Mischung) → Inspirationsschlauch → Y-Stück → Patient. Auf dem Weg wird das Gas überwacht (O₂-Sensor, Flowsensor), abgesichert (Sicherheitsventil) und gefiltert.',
  },
  {
    id: 'trace-signal',
    type: 'sequence',
    title: 'Verfolge den Signalweg der PEEP-Regelung',
    level: 'Fortgeschritten',
    intro: 'Ein Regelkreis besteht aus Messen → Vergleichen → Stellen. Klicke die drei beteiligten Komponenten in dieser Reihenfolge an.',
    steps: [['pressure_sensor'], ['control'], ['exp_valve']],
    optional: [],
    explain:
      'Der Drucksensor misst den Istwert (Paw). Die Steuereinheit vergleicht ihn mit dem eingestellten PEEP (Sollwert) und stellt die Kraft des Aktors am Exspirationsventil nach. Starte im Tab „Funktion“ den Modus „Regelkreis“, um die Signale zu sehen.',
  },
  {
    id: 'explain',
    type: 'order',
    title: 'Erkläre den technischen Ablauf eines Atemzugs',
    level: 'Experte',
    intro: 'Bringe die Schritte eines volumenkontrollierten Atemzugs in die richtige Reihenfolge. Erkläre danach den Ablauf in eigenen Worten.',
    items: [
      'Die Steuereinheit startet die Inspiration und schließt das Exspirationsventil.',
      'Die Proportionalventile öffnen; O₂ und Druckluft werden im eingestellten Verhältnis gemischt.',
      'Das Gas strömt mit konstantem Flow über Inspirationsschlauch und Y-Stück in die Lunge – der Atemwegsdruck steigt.',
      'Ist das eingestellte Tidalvolumen abgegeben, schließen die Proportionalventile.',
      'Das Exspirationsventil öffnet; die Lunge entleert sich passiv durch ihre elastischen Rückstellkräfte.',
      'Das Exspirationsventil hält den PEEP aufrecht; der exspiratorische Flowsensor misst das ausgeatmete Volumen.',
    ],
    model:
      'Bei der volumenkontrollierten Beatmung gibt das Gerät ein festgelegtes Volumen mit konstantem Flow ab. Dazu schließt die Steuereinheit das Exspirationsventil und regelt die Proportionalventile so, dass Flow und Mischung (FiO₂) den Sollwerten entsprechen. Der Druck in der Lunge steigt dabei abhängig von Compliance und Resistance (Paw = V/C + R·V̇ + PEEP). Nach Abgabe des Volumens schließen die Inspirationsventile, das Exspirationsventil öffnet und die Lunge atmet passiv aus. Das Exspirationsventil verhindert, dass der Druck unter den PEEP fällt, damit die Alveolen offen bleiben. Der exspiratorische Flowsensor misst das zurückkommende Volumen; Unterschiede zum abgegebenen Volumen weisen auf Leckagen hin.',
  },
];
