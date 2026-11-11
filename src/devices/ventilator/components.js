/**
 * Fachinhalte der Komponenten des Intensiv-Beatmungsgeräts (Lehrmodell).
 *
 * Grundlage ist der allgemein dokumentierte Aufbau ventilgesteuerter
 * Intensivrespiratoren mit zentraler Gasversorgung (O₂ + Druckluft).
 * Die 3D-Geometrie ist SCHEMATISCH und entspricht keinem konkreten
 * Hersteller. Anordnung, Reihenfolge und Integration der Bauteile
 * unterscheiden sich je nach Gerät – das ist in den Texten vermerkt.
 *
 * Felder:
 *  id, name, kurz       – Bezeichnung
 *  gruppe               – Funktionsgruppe (siehe GROUPS)
 *  funktion             – Wozu dient das Bauteil?
 *  technik              – Technische Erklärung
 *  prinzip              – Physikalisches Prinzip (mit Formel, wo sinnvoll)
 *  formel               – optionale Kernformel
 *  verbindungen         – [{ id, art }] Verknüpfung zu anderen Komponenten
 *  fehler               – Typische Fehlerbilder
 *  begriffe             – Relevante Fachbegriffe [{ term, def }]
 *  hinweis              – Didaktischer/Genauigkeits-Hinweis (optional)
 *  kern                 – true = zählt zu den wichtigsten Komponenten
 */

export const GROUPS = {
  gas: { name: 'Gasversorgung', color: '#14b8a6' },
  insp: { name: 'Inspiration', color: '#3b82f6' },
  kreis: { name: 'Patientenschlauchsystem', color: '#a855f7' },
  exsp: { name: 'Exspiration', color: '#f97316' },
  steuer: { name: 'Steuerung & Energie', color: '#22c55e' },
  patient: { name: 'Patientenmodell', color: '#ec4899' },
};

export const COMPONENTS = [
  {
    id: 'o2_inlet',
    name: 'Sauerstoff-Anschluss (O₂-Gaseinlass)',
    kurz: 'O₂-Einlass',
    gruppe: 'gas',
    kern: true,
    funktion:
      'Verbindet das Gerät mit der zentralen Sauerstoffversorgung (Wandanschluss) oder einer Druckgasflasche und liefert reinen Sauerstoff für die Atemgasmischung.',
    technik:
      'Geräteseitig wird ein gasartspezifisch codierter Anschluss verwendet (z. B. NIST- oder DISS-System), der ein Vertauschen mit anderen Gasen mechanisch verhindert. Der Schlauch zur Wandentnahmestelle ist ebenfalls gasartspezifisch (in Deutschland Steckkupplungen nach DIN 13260-2). Ein Rückschlagventil verhindert, dass Gas aus dem Gerät in die Versorgungsleitung zurückströmt.',
    prinzip:
      'Gasspeicherung und -transport unter Überdruck. Der Versorgungsdruck der Zentralversorgung liegt typischerweise im Bereich von etwa 4–5 bar; Intensivbeatmungsgeräte sind für einen Eingangsdruckbereich von ca. 2,8–6 bar ausgelegt (Herstellerangaben beachten).',
    formel: 'p · V = n · R · T',
    verbindungen: [
      { id: 'regulator', art: 'liefert O₂ unter Versorgungsdruck an' },
      { id: 'control', art: 'Versorgungsdruck wird überwacht von' },
    ],
    fehler: [
      'Ausfall der O₂-Versorgung → Alarm „O₂-Versorgungsdruck niedrig“; das Gerät beatmet ggf. nur noch mit Druckluft (FiO₂ 0,21).',
      'Undichte Kupplung → hörbares Zischen, erhöhter Gasverbrauch.',
      'Schlauch geknickt oder nicht eingerastet → Druckabfall unter Last.',
    ],
    begriffe: [
      { term: 'NIST / DISS', def: 'Gasartspezifische Steckverbindungssysteme (Non-Interchangeable Screw Thread / Diameter Index Safety System), die Fehlanschlüsse verhindern.' },
      { term: 'ISO 32 Farbcodierung', def: 'Europäisch: Sauerstoff = weiß, medizinische Druckluft = schwarz-weiß. (In den USA ist O₂ grün.)' },
      { term: 'Zentrale Gasversorgung', def: 'Rohrleitungssystem im Krankenhaus mit Entnahmestellen am Patientenplatz (ISO 7396-1).' },
    ],
  },
  {
    id: 'air_inlet',
    name: 'Druckluft-Anschluss (Air-Gaseinlass)',
    kurz: 'Air-Einlass',
    gruppe: 'gas',
    kern: false,
    funktion:
      'Liefert medizinische Druckluft (21 % O₂). Durch Mischung mit reinem Sauerstoff lässt sich jede inspiratorische O₂-Konzentration (FiO₂) zwischen 0,21 und 1,0 einstellen.',
    technik:
      'Aufbau analog zum O₂-Anschluss, jedoch mit eigener Codierung. Manche Geräte besitzen statt eines Druckluftanschlusses eine interne Turbine bzw. ein Gebläse, das Umgebungsluft ansaugt – dieses Lehrmodell zeigt die ventilgesteuerte Variante mit zentraler Druckluft.',
    prinzip:
      'Gemischberechnung: Wird der Anteil x des Gesamtflows aus reinem O₂ geliefert, ergibt sich FiO₂ = 0,21 + 0,79 · x. Für FiO₂ = 0,40 muss also etwa 24 % des Flows aus der O₂-Leitung stammen.',
    formel: 'FiO₂ = 0,21 + 0,79 · x',
    verbindungen: [
      { id: 'regulator', art: 'liefert Druckluft an' },
      { id: 'prop_valves', art: 'Mischungspartner für' },
    ],
    fehler: [
      'Ausfall der Druckluftversorgung → Alarm; viele Geräte schalten automatisch auf 100 % O₂ um.',
      'Feuchtigkeit oder Ölreste in der Druckluft → Schäden an Ventilen und Sensoren (Filter beachten).',
    ],
    begriffe: [
      { term: 'FiO₂', def: 'Inspiratorische Sauerstofffraktion – Anteil von O₂ im Einatemgas (0,21–1,0).' },
      { term: 'Medizinische Druckluft', def: 'Arzneimittelqualität, getrocknet und ölfrei, ca. 21 % O₂ / 79 % N₂.' },
      { term: 'Turbinenbeatmungsgerät', def: 'Gerätetyp, der Umgebungsluft mit einem Gebläse verdichtet und daher keine Druckluftversorgung benötigt.' },
    ],
  },
  {
    id: 'regulator',
    name: 'Gaseinlassfilter & Druckregler',
    kurz: 'Druckregler',
    gruppe: 'gas',
    kern: true,
    funktion:
      'Filtert Partikel aus dem Versorgungsgas und reduziert den schwankenden Versorgungsdruck auf einen konstanten, niedrigeren Arbeitsdruck für die nachfolgenden Dosierventile.',
    technik:
      'Ein Sinterfilter hält Partikel zurück. Der Druckminderer besteht aus einer Membran, die von einer Feder belastet wird und ein Ventil steuert: Steigt der Ausgangsdruck, drückt er die Membran gegen die Feder und schließt das Ventil teilweise – fällt er, öffnet es. So bleibt der Arbeitsdruck auch bei wechselndem Verbrauch nahezu konstant. Je Gasart gibt es einen eigenen Zweig.',
    prinzip:
      'Kräftegleichgewicht an der Membran: Federkraft = Ausgangsdruck × Membranfläche. Ein konstanter Vordruck an den Proportionalventilen ist Voraussetzung für eine präzise Flowdosierung.',
    formel: 'F_Feder = p_aus · A_Membran',
    verbindungen: [
      { id: 'o2_inlet', art: 'erhält O₂ von' },
      { id: 'air_inlet', art: 'erhält Druckluft von' },
      { id: 'prop_valves', art: 'liefert konstanten Arbeitsdruck an' },
    ],
    fehler: [
      'Verstopfter Einlassfilter → zu geringer Flow bei hohem Bedarf.',
      'Membran- oder Federermüdung → Druckschwankungen, ungenaue FiO₂/Volumina.',
      'Undichtigkeit → Gasverlust im Gerät.',
    ],
    begriffe: [
      { term: 'Druckminderer', def: 'Regelventil, das einen hohen, variablen Vordruck in einen niedrigeren, konstanten Hinterdruck umwandelt.' },
      { term: 'Vordruck / Hinterdruck', def: 'Druck vor bzw. nach dem Druckminderer.' },
      { term: 'Sinterfilter', def: 'Poröser Filter aus verpressten Metall- oder Kunststoffpartikeln.' },
    ],
  },
  {
    id: 'prop_valves',
    name: 'Proportionalventile (Gasdosierung & -mischung)',
    kurz: 'Proportionalventile',
    gruppe: 'insp',
    kern: true,
    funktion:
      'Dosieren den Gasflow für O₂ und Druckluft getrennt und erzeugen damit gleichzeitig das gewünschte Gemisch (FiO₂) und den gewünschten Inspirationsflow bzw. -druck.',
    technik:
      'Elektromagnetisch betätigte Ventile: Ein Strom durch die Spule erzeugt eine Magnetkraft, die den Ventilstößel gegen eine Feder anhebt. Die Öffnung ist proportional zum Spulenstrom. Die Steuereinheit regelt beide Ventile in einem schnellen Regelkreis (Millisekunden-Takt), wobei Flowsensoren den Istwert liefern. Bei Turbinengeräten übernimmt ein Gebläse die Flowerzeugung; die O₂-Beimischung erfolgt dann ebenfalls über ein Ventil.',
    prinzip:
      'Durchfluss durch eine Drosselöffnung (Blendengleichung): Der Volumenstrom hängt von der Öffnungsfläche A und der Druckdifferenz Δp ab. Bei konstantem Vordruck (Druckregler) wird der Flow damit allein über die Öffnungsfläche – also den Spulenstrom – eingestellt.',
    formel: 'Q ≈ C_d · A · √(2 · Δp / ρ)',
    verbindungen: [
      { id: 'regulator', art: 'erhalten Arbeitsdruck von' },
      { id: 'control', art: 'werden angesteuert von' },
      { id: 'insp_flow', art: 'Istwert-Rückmeldung durch' },
      { id: 'o2_sensor', art: 'Gemisch wird kontrolliert durch' },
    ],
    fehler: [
      'Klemmendes Ventil → Flow/Volumen weichen vom Sollwert ab, Alarm „Volumen nicht erreicht“.',
      'FiO₂-Abweichung bei Fehldosierung eines Zweiges (Erkennung über O₂-Sensor).',
      'Spulenausfall → Geräteausfall-Alarm, Notatemventil gibt Spontanatmung frei.',
    ],
    begriffe: [
      { term: 'Proportionalventil', def: 'Ventil, dessen Öffnung kontinuierlich (nicht nur auf/zu) mit dem Ansteuersignal veränderbar ist.' },
      { term: 'Gasmischer (Blender)', def: 'Einheit, die zwei Gase im eingestellten Verhältnis mischt.' },
      { term: 'Sollwert / Istwert', def: 'Vorgegebener bzw. gemessener Wert einer Regelgröße.' },
    ],
  },
  {
    id: 'o2_sensor',
    name: 'O₂-Sensor',
    kurz: 'O₂-Sensor',
    gruppe: 'insp',
    kern: true,
    funktion:
      'Misst kontinuierlich die O₂-Konzentration im Inspirationsgas und überwacht damit die eingestellte FiO₂ unabhängig von der Dosierung.',
    technik:
      'Häufig wird eine galvanische Brennstoffzelle eingesetzt: Sauerstoff diffundiert durch eine Membran zur Kathode und wird dort reduziert, an der Bleianode findet die Oxidation statt. Der entstehende Strom ist proportional zum O₂-Partialdruck. Die Zelle verbraucht sich und muss regelmäßig ersetzt und (z. B. mit 21 % und 100 % O₂) kalibriert werden. Alternativ werden paramagnetische Sensoren verwendet, die nicht verschleißen.',
    prinzip:
      'Elektrochemie: O₂ + 2 H₂O + 4 e⁻ → 4 OH⁻ (Kathode), 2 Pb + 4 OH⁻ → 2 PbO + 2 H₂O + 4 e⁻ (Anode). Der Messstrom ist proportional zum O₂-Partialdruck – daher beeinflussen Luftdruck und Atemwegsdruck die Anzeige und werden kompensiert. Paramagnetische Sensoren nutzen, dass O₂-Moleküle von einem Magnetfeld angezogen werden.',
    formel: 'I ∝ p_O₂ = FiO₂ · p_gesamt',
    verbindungen: [
      { id: 'prop_valves', art: 'überwacht das Gemisch aus' },
      { id: 'control', art: 'sendet Messsignal an' },
      { id: 'alarm', art: 'löst bei Abweichung aus' },
    ],
    fehler: [
      'Verbrauchte Zelle → zu niedrige Messwerte, Alarm „O₂-Sensor kalibrieren/ersetzen“.',
      'Kondenswasser auf der Membran → träge oder falsche Messung.',
      'Fehlende Kalibrierung → systematischer Messfehler.',
    ],
    begriffe: [
      { term: 'Galvanische Zelle', def: 'Elektrochemische Zelle, die aus einer Redoxreaktion selbst Strom erzeugt (keine externe Spannung nötig).' },
      { term: 'Partialdruck', def: 'Anteil eines Gases am Gesamtdruck eines Gasgemisches (Gesetz von Dalton).' },
      { term: 'Paramagnetismus', def: 'Eigenschaft von O₂, in ein Magnetfeld hineingezogen zu werden.' },
    ],
  },
  {
    id: 'insp_flow',
    name: 'Inspiratorischer Flowsensor',
    kurz: 'Insp. Flowsensor',
    gruppe: 'insp',
    kern: false,
    funktion:
      'Misst den Gasfluss, den das Gerät in Richtung Patient abgibt. Er liefert den Istwert für die Flowregelung der Proportionalventile.',
    technik:
      'Je nach Hersteller als Differenzdruck-Flowsensor (definierter Strömungswiderstand, dessen Druckabfall gemessen wird) oder als thermischer Sensor ausgeführt. Bei vielen Geräten ist die Flowmessung direkt in die Gasdosiermodule integriert; die Position im Lehrmodell ist daher schematisch.',
    prinzip:
      'Differenzdruckverfahren (Pneumotachograph): Bei laminarer Strömung durch einen definierten Widerstand ist der Druckabfall proportional zum Flow (Hagen-Poiseuille). Durch Integration des Flows über die Zeit erhält man das Volumen.',
    formel: 'V̇ = Δp / R   ·   V = ∫ V̇ dt',
    verbindungen: [
      { id: 'prop_valves', art: 'misst den Flow nach' },
      { id: 'control', art: 'liefert Istwert an' },
    ],
    fehler: [
      'Sensordrift → Abweichung zwischen eingestelltem und abgegebenem Volumen.',
      'Verunreinigung → falsche Flowwerte.',
    ],
    begriffe: [
      { term: 'Flow (V̇)', def: 'Volumenstrom, meist in L/min angegeben.' },
      { term: 'Pneumotachograph', def: 'Flowmesser, der den Druckabfall über einem bekannten Strömungswiderstand misst.' },
      { term: 'Hagen-Poiseuille', def: 'Gesetz für laminare Rohrströmung: R ∝ L / r⁴.' },
    ],
  },
  {
    id: 'safety_valve',
    name: 'Sicherheits- & Notatemventil',
    kurz: 'Sicherheitsventil',
    gruppe: 'insp',
    kern: true,
    funktion:
      'Begrenzt den Druck im Inspirationsweg mechanisch auf einen Maximalwert (Überdruckschutz) und öffnet bei Geräte- oder Gasversorgungsausfall den Weg zur Umgebungsluft, damit der Patient spontan atmen kann.',
    technik:
      'Federbelastetes Ventil, das unabhängig von Software und Elektronik arbeitet. Im Normalbetrieb geschlossen. Überschreitet der Druck den gerätespezifisch festgelegten Grenzwert, öffnet es. Im Fehlerfall (z. B. Stromausfall ohne Akku) wird das Ventil in eine Offenstellung gebracht, sodass Umgebungsluft eingeatmet werden kann.',
    prinzip:
      'Kräftegleichgewicht: Das Ventil öffnet, wenn die Druckkraft auf den Ventilteller die Federvorspannkraft übersteigt.',
    formel: 'öffnet, wenn p · A > F_Feder',
    verbindungen: [
      { id: 'prop_valves', art: 'sichert den Inspirationsweg nach' },
      { id: 'control', art: 'Zustand wird überwacht von' },
      { id: 'pressure_sensor', art: 'arbeitet unabhängig von' },
    ],
    fehler: [
      'Verklebtes oder verschmutztes Ventil → Leckage oder kein Überdruckschutz.',
      'Fehlauslösung → Volumenverlust, Alarm „Leckage“.',
    ],
    begriffe: [
      { term: 'Überdruckventil', def: 'Mechanisches Ventil, das bei Überschreiten eines Grenzdrucks öffnet.' },
      { term: 'Notatemventil (Anti-Asphyxie)', def: 'Ermöglicht Spontanatmung von Umgebungsluft bei Ausfall des Geräts.' },
      { term: 'Fail-safe', def: 'Auslegungsprinzip: Im Fehlerfall geht ein System in einen sicheren Zustand.' },
    ],
  },
  {
    id: 'pressure_sensor',
    name: 'Drucksensor (Atemwegsdruck)',
    kurz: 'Drucksensor',
    gruppe: 'steuer',
    kern: true,
    funktion:
      'Misst den Druck im Beatmungssystem (Atemwegsdruck Paw). Daraus werden Spitzendruck, Plateaudruck und PEEP bestimmt; der Messwert dient der Druckregelung und der Alarmüberwachung (z. B. Stenose, Diskonnektion).',
    technik:
      'Piezoresistive Halbleiter-Drucksensoren (MEMS) auf der Elektronikplatine sind über dünne Druckmessleitungen mit dem Gasweg verbunden. Häufig gibt es redundante Sensoren auf der In- und Exspirationsseite, die sich gegenseitig plausibilisieren. Ein Magnetventil schaltet die Sensoren zyklisch auf Umgebungsdruck (Nullpunktabgleich).',
    prinzip:
      'Piezoresistiver Effekt: Der Druck verformt eine dünne Siliziummembran; in die Membran eingebettete Widerstände ändern dadurch ihren Widerstand. In einer Wheatstone-Brücke wird diese Änderung in eine messbare Spannung umgesetzt.',
    formel: 'ΔR / R = π · σ   →   U_Brücke ∝ p',
    verbindungen: [
      { id: 'control', art: 'liefert Druck-Istwert an' },
      { id: 'exp_valve', art: 'Regelgröße für PEEP über' },
      { id: 'alarm', art: 'Grenzwertüberwachung für' },
    ],
    fehler: [
      'Kondenswasser in der Druckmessleitung → gedämpfte oder falsche Druckkurve.',
      'Nullpunktdrift → systematisch falscher PEEP-/Druckwert.',
      'Undichte Messleitung → zu niedrige Drücke, Fehlalarme.',
    ],
    begriffe: [
      { term: 'Paw', def: 'Airway pressure – Atemwegsdruck, meist in mbar bzw. cmH₂O (1 mbar ≈ 1,02 cmH₂O).' },
      { term: 'Wheatstone-Brücke', def: 'Brückenschaltung aus vier Widerständen zur präzisen Messung kleiner Widerstandsänderungen.' },
      { term: 'Pmax / Ppeak', def: 'Höchster Atemwegsdruck während der Inspiration.' },
    ],
  },
  {
    id: 'insp_filter',
    name: 'Inspiratorischer Bakterien-/Virenfilter',
    kurz: 'Insp. Filter',
    gruppe: 'kreis',
    kern: false,
    funktion:
      'Schützt Patient und Gerät gegenseitig vor Kontamination durch Mikroorganismen und Partikel am Inspirationsausgang.',
    technik:
      'Einwegfilter mit elektrostatisch geladenem oder mechanischem (z. B. Glasfaser-)Filtermedium. Er wird auf den Inspirationsausgang gesteckt und gemäß Herstellervorgabe gewechselt.',
    prinzip:
      'Partikelabscheidung durch Trägheit, Diffusion, Sperreffekt und elektrostatische Anziehung. Jeder Filter ist ein zusätzlicher Strömungswiderstand.',
    formel: 'Δp = R_Filter · V̇',
    verbindungen: [
      { id: 'insp_limb', art: 'leitet Atemgas weiter an' },
      { id: 'safety_valve', art: 'nachgeschaltet zu' },
    ],
    fehler: [
      'Durchfeuchteter Filter → stark erhöhter Widerstand, Druckanstieg.',
      'Vergessener Filterwechsel → Hygienerisiko.',
    ],
    begriffe: [
      { term: 'Filtrationseffizienz', def: 'Anteil zurückgehaltener Partikel bzw. Keime.' },
      { term: 'Strömungswiderstand', def: 'Verhältnis von Druckabfall zu Flow (mbar/(L/s)).' },
    ],
  },
  {
    id: 'insp_limb',
    name: 'Inspirationsschlauch',
    kurz: 'Insp.-Schlauch',
    gruppe: 'kreis',
    kern: true,
    funktion:
      'Leitet das aufbereitete Atemgas vom Gerät zum Y-Stück und damit zum Patienten.',
    technik:
      'Flexibler, meist gerippter Kunststoffschlauch (Einweg oder aufbereitbar). Bei aktiver Befeuchtung oft mit Heizdraht gegen Kondensation. Die Dehnbarkeit des Schlauchsystems (Schlauchcompliance) wird beim Gerätetest gemessen und bei der Volumenberechnung kompensiert.',
    prinzip:
      'Strömungswiderstand (laminar: Hagen-Poiseuille, R ∝ L / r⁴) und Schlauchcompliance: Ein Teil des abgegebenen Volumens dehnt den Schlauch und erreicht den Patienten nicht.',
    formel: 'V_Schlauch = C_Schlauch · Δp',
    verbindungen: [
      { id: 'insp_filter', art: 'erhält Gas über' },
      { id: 'y_piece', art: 'führt zum' },
    ],
    fehler: [
      'Diskonnektion → Druckabfall, Alarm „Diskonnektion / Paw niedrig“.',
      'Abgeknickter Schlauch → Druckanstieg, Alarm „Stenose / Paw hoch“.',
      'Kondenswasser im Schlauch → Strömungsgeräusche, Triggerprobleme.',
    ],
    begriffe: [
      { term: 'Schlauchcompliance', def: 'Volumenänderung des Schlauchsystems pro Druckänderung (ml/mbar).' },
      { term: 'Inspirationsschenkel', def: 'Der zum Patienten führende Teil des Schlauchsystems.' },
    ],
  },
  {
    id: 'y_piece',
    name: 'Y-Stück',
    kurz: 'Y-Stück',
    gruppe: 'kreis',
    kern: true,
    funktion:
      'Verbindet Inspirations- und Exspirationsschlauch mit dem patientenseitigen Anschluss (Tubus/Trachealkanüle bzw. Filter).',
    technik:
      'Formteil mit drei Anschlüssen. Ab dem Y-Stück strömt das Gas in beide Richtungen (Ein- und Ausatmung). Bei einigen Geräten sitzt hier ein proximaler Flowsensor.',
    prinzip:
      'Der Raum zwischen Y-Stück und Patient wird bei jedem Atemzug hin und her geatmet und zählt zum apparativen Totraum: Hier wird CO₂-haltiges Gas rückgeatmet.',
    formel: 'V_A = V_T − V_D',
    verbindungen: [
      { id: 'insp_limb', art: 'erhält Inspirationsgas aus' },
      { id: 'exp_limb', art: 'gibt Exspirationsgas ab an' },
      { id: 'hme', art: 'patientenseitig verbunden mit' },
    ],
    fehler: [
      'Diskonnektion am Y-Stück → häufigste Ursache für Diskonnektionsalarme.',
      'Zusätzliche Adapter → vergrößerter Totraum.',
    ],
    begriffe: [
      { term: 'Totraum (V_D)', def: 'Volumen, das nicht am Gasaustausch teilnimmt (anatomisch + apparativ).' },
      { term: 'Proximale Messung', def: 'Messung direkt am Patienten, z. B. am Y-Stück.' },
    ],
  },
  {
    id: 'hme',
    name: 'HME-Filter (Wärme- und Feuchtigkeitstauscher)',
    kurz: 'HME-Filter',
    gruppe: 'kreis',
    kern: false,
    funktion:
      'Ersetzt die Anfeuchtung und Erwärmung, die normalerweise in der Nase stattfindet, da der Tubus die oberen Atemwege umgeht („künstliche Nase“).',
    technik:
      'Hygroskopisches Medium speichert bei der Ausatmung Wärme und Feuchtigkeit und gibt sie bei der nächsten Einatmung wieder ab. Oft mit Filterfunktion (HMEF). Alternative ist die aktive Befeuchtung mit beheiztem Wasserbad – beides darf nicht gleichzeitig verwendet werden.',
    prinzip:
      'Regenerativer Wärme- und Stoffaustausch: Kondensation und Adsorption von Wasserdampf bei der Exspiration, Verdunstung bei der Inspiration. Nachteil: zusätzlicher Totraum und Widerstand.',
    formel: 'zusätzlicher Totraum + Widerstand',
    verbindungen: [
      { id: 'y_piece', art: 'zwischen Y-Stück und Patient' },
      { id: 'lung', art: 'befeuchtet das Atemgas für' },
    ],
    fehler: [
      'Verlegung durch Sekret oder Wasser → Widerstandsanstieg, hohe Beatmungsdrücke.',
      'Gleichzeitige aktive Befeuchtung → Durchnässung und Verlegung.',
      'Großer Totraum → CO₂-Rückatmung, besonders bei kleinen Atemzugvolumina.',
    ],
    begriffe: [
      { term: 'HME / HMEF', def: 'Heat and Moisture Exchanger (ohne / mit Filterfunktion).' },
      { term: 'Absolute Feuchte', def: 'Wasserdampfmenge pro Volumen Gas (mg/L).' },
    ],
  },
  {
    id: 'exp_limb',
    name: 'Exspirationsschlauch',
    kurz: 'Exsp.-Schlauch',
    gruppe: 'kreis',
    kern: false,
    funktion:
      'Leitet das ausgeatmete Gas vom Y-Stück zurück zum Exspirationseingang des Geräts.',
    technik:
      'Aufbau wie der Inspirationsschlauch. Da das Ausatemgas warm und wassergesättigt ist, kondensiert hier besonders viel Wasser; beheizte Schläuche oder Wasserfallen werden eingesetzt.',
    prinzip:
      'Abkühlung von wassergesättigtem Gas senkt den Sättigungsdampfdruck → Kondensation.',
    formel: 'Taupunkt-Unterschreitung → Kondensat',
    verbindungen: [
      { id: 'y_piece', art: 'erhält Exspirationsgas vom' },
      { id: 'exp_flow', art: 'führt zum' },
    ],
    fehler: [
      'Kondenswasser → Fehlmessung des exspiratorischen Flows, Autotriggerung.',
      'Diskonnektion → Alarm „exspiratorisches Volumen niedrig“.',
    ],
    begriffe: [
      { term: 'Exspirationsschenkel', def: 'Der vom Patienten zurückführende Teil des Schlauchsystems.' },
      { term: 'Wasserfalle', def: 'Behälter am tiefsten Punkt des Schlauchs zum Sammeln von Kondensat.' },
    ],
  },
  {
    id: 'exp_flow',
    name: 'Exspiratorischer Flowsensor',
    kurz: 'Exsp. Flowsensor',
    gruppe: 'exsp',
    kern: true,
    funktion:
      'Misst das ausgeatmete Volumen (Vte) und das Atemminutenvolumen. Diese Werte zeigen, was tatsächlich beim Patienten angekommen ist, und sind Grundlage für Volumen- und Leckagealarme.',
    technik:
      'Häufig als Hitzdraht-Anemometer: Ein beheizter, sehr dünner Platindraht wird vom Gas gekühlt; die zur Konstanthaltung der Temperatur nötige Heizleistung ist ein Maß für den Massenfluss. Je nach Hersteller sitzt der Sensor am Exspirationsausgang oder proximal am Y-Stück. Er muss regelmäßig kalibriert werden.',
    prinzip:
      'Konvektive Wärmeübertragung (King’sches Gesetz): Die abgeführte Wärmeleistung steigt mit der Strömungsgeschwindigkeit. Die Differenz von inspiratorischem und exspiratorischem Volumen ergibt die Leckage.',
    formel: 'P = (A + B · √v) · ΔT',
    verbindungen: [
      { id: 'exp_limb', art: 'erhält Gas aus' },
      { id: 'exp_valve', art: 'liegt im Gasweg vor' },
      { id: 'control', art: 'liefert Vte und MV an' },
    ],
    fehler: [
      'Feuchtigkeit oder Medikamentenaerosol (Vernebler) auf dem Draht → falsche Volumina, Sensordefekt.',
      'Gerissener Draht → Alarm „Flowsensor defekt“, Volumenmonitoring fällt aus.',
      'Differenz Vti/Vte groß → Hinweis auf Leckage (z. B. Cuff undicht).',
    ],
    begriffe: [
      { term: 'Vte / Vti', def: 'Exspiratorisches / inspiratorisches Tidalvolumen.' },
      { term: 'Atemminutenvolumen (MV)', def: 'Atemzugvolumen × Atemfrequenz (L/min).' },
      { term: 'Hitzdraht-Anemometrie', def: 'Strömungsmessung über die Abkühlung eines beheizten Drahts.' },
    ],
  },
  {
    id: 'exp_valve',
    name: 'Exspirationsventil (PEEP-Ventil)',
    kurz: 'Exspirationsventil',
    gruppe: 'exsp',
    kern: true,
    funktion:
      'Ist während der Inspiration geschlossen, damit sich die Lunge füllt. In der Exspiration öffnet es und regelt den positiven endexspiratorischen Druck (PEEP), der die Alveolen offenhält.',
    technik:
      'Aktiv geregeltes Membranventil: Ein elektromagnetischer Aktor (z. B. Tauchspule) drückt mit einstellbarer Kraft auf eine Membran. Das Ausatemgas kann nur abströmen, solange sein Druck größer ist als der dadurch eingestellte Gegendruck. Aktive Ventile erlauben zudem freies Durchatmen in druckkontrollierten Modi.',
    prinzip:
      'Kräftegleichgewicht an der Membran: Gas strömt ab, solange p · A_Membran > F_Aktor. Der PEEP entspricht damit F_Aktor / A_Membran. Die Ausatmung selbst ist passiv – angetrieben durch die elastischen Rückstellkräfte der Lunge.',
    formel: 'PEEP = F_Aktor / A_Membran',
    verbindungen: [
      { id: 'exp_flow', art: 'liegt im Gasweg hinter' },
      { id: 'control', art: 'wird angesteuert von' },
      { id: 'pressure_sensor', art: 'PEEP-Regelung mit Istwert vom' },
    ],
    fehler: [
      'Undichte oder falsch eingesetzte Membran → Leckage, PEEP wird nicht gehalten.',
      'Kondensat oder Verschmutzung → erhöhter Ausatemwiderstand, unvollständige Exspiration (Auto-PEEP).',
      'Ventil schließt nicht → Volumen nicht erreicht.',
    ],
    begriffe: [
      { term: 'PEEP', def: 'Positive End-Expiratory Pressure – Druck, der am Ende der Ausatmung im System verbleibt.' },
      { term: 'Intrinsischer PEEP (Auto-PEEP)', def: 'Zusätzlicher Druck durch unvollständige Ausatmung bei zu kurzer Exspirationszeit.' },
      { term: 'Tauchspule (Voice Coil)', def: 'Elektromagnetischer Linearantrieb, Kraft proportional zum Strom.' },
    ],
  },
  {
    id: 'control',
    name: 'Steuereinheit (Regelungselektronik)',
    kurz: 'Steuereinheit',
    gruppe: 'steuer',
    kern: true,
    funktion:
      'Das „Gehirn“ des Geräts: setzt den eingestellten Beatmungsmodus um, liest alle Sensoren aus, regelt die Ventile und überwacht die Alarmgrenzen.',
    technik:
      'Mikrocontroller-/Prozessorsystem mit Analog-Digital-Wandlern für die Sensorsignale und Treiberstufen für die Ventile. Schnelle Regelkreise (z. B. PI-Regler) vergleichen fortlaufend Soll- und Istwerte von Flow und Druck. Viele Geräte nutzen eine unabhängige Überwachungseinheit (Watchdog), die bei Fehlern das Gerät in einen sicheren Zustand versetzt.',
    prinzip:
      'Geschlossener Regelkreis: Regelabweichung e = Soll − Ist bestimmt die Stellgröße u. Die Abtastrate muss mindestens doppelt so hoch sein wie die höchste relevante Signalfrequenz (Abtasttheorem).',
    formel: 'u(t) = K_P · e(t) + K_I · ∫ e(t) dt',
    verbindungen: [
      { id: 'pressure_sensor', art: 'liest Druck vom' },
      { id: 'insp_flow', art: 'liest Flow vom' },
      { id: 'exp_flow', art: 'liest Vte vom' },
      { id: 'o2_sensor', art: 'liest FiO₂ vom' },
      { id: 'prop_valves', art: 'steuert' },
      { id: 'exp_valve', art: 'steuert' },
      { id: 'display', art: 'kommuniziert mit' },
      { id: 'alarm', art: 'löst aus' },
      { id: 'power', art: 'wird versorgt von' },
    ],
    fehler: [
      'Software- oder Hardwarefehler → technischer Alarm, Gerät geht in sicheren Zustand; Patient muss ggf. manuell beatmet werden.',
      'Fehlerhafter Sensorwert → Regelung arbeitet auf falscher Basis (Plausibilitätsprüfung nötig).',
    ],
    begriffe: [
      { term: 'Regelkreis', def: 'Kreislauf aus Messen, Vergleichen und Stellen zur Konstanthaltung einer Größe.' },
      { term: 'ADC', def: 'Analog-Digital-Converter – wandelt Sensorspannungen in Zahlenwerte.' },
      { term: 'Watchdog', def: 'Unabhängige Überwachungsschaltung, die einen hängenden Prozessor erkennt.' },
    ],
  },
  {
    id: 'display',
    name: 'Bedien- und Anzeigeeinheit',
    kurz: 'Display',
    gruppe: 'steuer',
    kern: true,
    funktion:
      'Schnittstelle zum Anwender: Einstellen von Beatmungsmodus, Parametern und Alarmgrenzen sowie Anzeige von Messwerten und Kurven (Druck, Flow, Volumen).',
    technik:
      'Farbdisplay mit Touchscreen und meist einem Dreh-Drück-Knopf zur sicheren Bestätigung. Kurvendarstellungen (Druck-, Flow-, Volumen-Zeit-Kurven, Loops) unterstützen die Beurteilung der Beatmung. Im 3D-Modell zeigt das Display eine vereinfachte Live-Darstellung der Simulation.',
    prinzip:
      'Kapazitiver Touchscreen: Ein Finger verändert die Kapazität einer Elektrodenmatrix lokal; daraus wird die Berührposition berechnet.',
    formel: 'C = ε₀ · ε_r · A / d',
    verbindungen: [
      { id: 'control', art: 'tauscht Daten aus mit' },
      { id: 'alarm', art: 'zeigt Alarme an zusammen mit' },
    ],
    fehler: [
      'Fehlbedienung (z. B. falscher Parameter) → falsche Beatmung; Bestätigungskonzept und Plausibilitätsgrenzen reduzieren das Risiko.',
      'Touchscreen reagiert nicht (Desinfektionsmittel, Defekt) → Bedienung über Drehknopf.',
    ],
    begriffe: [
      { term: 'Beatmungskurven', def: 'Zeitverläufe von Druck, Flow und Volumen.' },
      { term: 'Loop', def: 'Darstellung zweier Größen gegeneinander, z. B. Druck-Volumen-Schleife.' },
    ],
  },
  {
    id: 'power',
    name: 'Netzteil & Akku',
    kurz: 'Netzteil/Akku',
    gruppe: 'steuer',
    kern: false,
    funktion:
      'Versorgt Elektronik, Ventile und Display mit Energie und überbrückt Netzausfälle sowie Transporte mit einem internen Akku.',
    technik:
      'Schaltnetzteil wandelt Netzwechselspannung in Gleichspannung. Ein Lade- und Umschaltmanagement schaltet bei Netzausfall unterbrechungsfrei auf den Akku (häufig Lithium-Ionen) um. Die Restlaufzeit wird angezeigt.',
    prinzip:
      'Elektrische Energie und Leistung: Die Akkukapazität bestimmt die Laufzeit bei gegebener Leistungsaufnahme.',
    formel: 't ≈ (U · Q) / P',
    verbindungen: [
      { id: 'control', art: 'versorgt' },
      { id: 'alarm', art: 'Netzausfall wird gemeldet über' },
    ],
    fehler: [
      'Netzausfall → Alarm „Akkubetrieb“.',
      'Gealterter Akku → deutlich verkürzte Laufzeit, gefährlich bei Transporten.',
      'Tiefentladung → Gerät schaltet ab; Notatemventil öffnet.',
    ],
    begriffe: [
      { term: 'Schaltnetzteil', def: 'Effiziente Spannungswandlung durch schnelles Schalten und Transformation bei hoher Frequenz.' },
      { term: 'USV-Funktion', def: 'Unterbrechungsfreie Stromversorgung durch automatische Akkuumschaltung.' },
    ],
  },
  {
    id: 'alarm',
    name: 'Alarmsystem (Lautsprecher & Alarm-LED)',
    kurz: 'Alarmsystem',
    gruppe: 'steuer',
    kern: false,
    funktion:
      'Macht kritische Zustände akustisch und optisch erkennbar – z. B. Diskonnektion, zu hoher Druck, Apnoe, Versorgungsausfall.',
    technik:
      'Alarme werden nach Priorität unterschieden (IEC 60601-1-8): hohe Priorität (rot, blinkend), mittlere (gelb, blinkend), niedrige (gelb oder cyan, dauerhaft) mit unterschiedlichen Tonfolgen. Viele Geräte haben einen zusätzlichen, unabhängigen Summer für den Fall eines Elektronikausfalls.',
    prinzip:
      'Schallerzeugung mit Lautsprecher/Piezo-Summer; Tonmuster codieren die Dringlichkeit, Lichtsignale die Priorität.',
    formel: 'Priorität: hoch / mittel / niedrig',
    verbindungen: [
      { id: 'control', art: 'wird ausgelöst von' },
      { id: 'display', art: 'Alarmtext auf' },
    ],
    fehler: [
      'Alarmermüdung durch zu eng gesetzte Grenzen → echte Alarme werden übersehen.',
      'Stummgeschaltete Alarme → verzögerte Reaktion.',
    ],
    begriffe: [
      { term: 'Alarmpriorität', def: 'Einstufung nach Dringlichkeit der erforderlichen Reaktion.' },
      { term: 'Alarm Fatigue', def: 'Abstumpfung des Personals durch häufige, nicht relevante Alarme.' },
    ],
  },
  {
    id: 'lung',
    name: 'Testlunge (Patientenmodell)',
    kurz: 'Testlunge',
    gruppe: 'patient',
    kern: false,
    funktion:
      'Stellt den Patienten vereinfacht dar. Mit einer Testlunge wird das Gerät vor dem Einsatz geprüft (Gerätecheck). In der Animation zeigt sie, wie sich die Lunge füllt und wieder entleert.',
    technik:
      'Kein Bestandteil des Beatmungsgeräts. Das Modell entspricht einer Ein-Kompartiment-Lunge mit Compliance C (Dehnbarkeit) und Resistance R (Atemwegswiderstand). Die Simulation im Funktionsmodus nutzt genau dieses Modell.',
    prinzip:
      'Bewegungsgleichung des respiratorischen Systems: Der Atemwegsdruck setzt sich aus elastischem Anteil, resistivem Anteil und PEEP zusammen. Die passive Ausatmung folgt einer Exponentialfunktion mit der Zeitkonstante τ = R · C.',
    formel: 'Paw = V / C + R · V̇ + PEEP',
    verbindungen: [
      { id: 'hme', art: 'erhält Atemgas über' },
      { id: 'y_piece', art: 'angeschlossen über' },
    ],
    fehler: [
      'Steife Lunge (niedrige Compliance, z. B. ARDS) → hohe Drücke bei gleichem Volumen.',
      'Hoher Widerstand (z. B. Bronchospasmus) → hoher Spitzendruck, verlängerte Ausatmung, Auto-PEEP.',
    ],
    begriffe: [
      { term: 'Compliance (C)', def: 'Dehnbarkeit: Volumenänderung pro Druckänderung (ml/mbar).' },
      { term: 'Resistance (R)', def: 'Atemwegswiderstand: Druckabfall pro Flow (mbar/(L/s)).' },
      { term: 'Zeitkonstante τ', def: 'τ = R · C; nach etwa 3 τ ist die Ausatmung zu ca. 95 % abgeschlossen.' },
    ],
    hinweis: 'Patientenmodell – kein Gerätebestandteil.',
  },
];

export const COMPONENT_BY_ID = Object.fromEntries(COMPONENTS.map((c) => [c.id, c]));
