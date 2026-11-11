# MedTech 3D Explorer

Interaktiver 3D-Geräteexplorer für Medizintechnik. Nutzer erkunden medizinische Geräte virtuell und verstehen ihren technischen Aufbau, ihre Funktion und die zugrunde liegende Physik.

> **Lehrmodelle, keine Herstellergeometrie.** Alle 3D-Modelle sind schematisch, herstellerunabhängig und als solche gekennzeichnet. Es werden nur Komponenten dargestellt, die zum allgemein dokumentierten Funktionsprinzip der Geräteklasse gehören. Nicht für klinische Entscheidungen.

## Funktionen

| Bereich | Umsetzung |
| --- | --- |
| 3D-Ansicht | Drehen, Zoomen, Verschieben (Maus & Touch), Doppelklick fokussiert ein Bauteil |
| Komponenten | Auswahl per Klick, Hover-Hervorhebung, nummerierte Beschriftungen, Fokusmodus (andere abdunkeln) |
| Schnittdarstellung | Schnittebene entlang X/Y/Z, Gehäuse massiv/transparent/ausgeblendet |
| Explosionsansicht | Stufenlos per Schieberegler |
| Funktionsanimation | Gasfluss (O₂, Druckluft, Gemisch, Ausatemgas), Regelkreis-Signale, Ventil- und Lungenbewegung, Live-Kurven (Druck/Flow/Volumen) und virtuelles Gerätedisplay – alles aus einer physikalischen Simulation |
| Bauteilinfos | Name, Bild (aus dem 3D-Modell gerendert), Funktion, technische Erklärung, physikalisches Prinzip mit Formel, Verbindungen (klickbar), typische Fehlerbilder, Fachbegriffe |
| Lernmodus | 6 Aufgaben: Drucksensor finden, Kernkomponenten identifizieren, Funktionen zuordnen, Gasweg verfolgen, Signalweg (PEEP-Regelkreis) verfolgen, Ablauf eines Atemzugs ordnen und erklären; Fortschritt wird lokal gespeichert |
| Gerätebibliothek | 8 Geräte; das Beatmungsgerät ist vollständig interaktiv, für die übrigen sind Hauptkomponenten und geplante Animationen hinterlegt |

### Beatmungsgerät (vollständig umgesetzt)

Ventilgesteuerter Intensivrespirator mit zentraler Gasversorgung, **20 erklärte Komponenten** in sechs Funktionsgruppen (Gasversorgung, Inspiration, Patientenschlauchsystem, Exspiration, Steuerung & Energie, Patientenmodell).

Die Animation basiert auf dem **Ein-Kompartiment-Modell** der volumenkontrollierten Beatmung (VC-CMV):

```
Paw = V / C + R · V̇ + PEEP        τ = R · C
```

Einstellbar: Atemfrequenz, Tidalvolumen, PEEP, I:E, FiO₂, Compliance, Resistance. Berechnet werden u. a. Spitzen- und Plateaudruck, Driving Pressure, Zeitkonstante, intrinsischer PEEP (Auto-PEEP) und Atemminutenvolumen. Szenarien „Steife Lunge“ und „Atemwegsobstruktion“ zeigen typische Effekte.

## Technik

- [Three.js](https://threejs.org/) (WebGL) mit prozedural erzeugten, leichtgewichtigen Modellen – keine großen Modelldateien
- Vanilla JavaScript (ES-Module), [Vite](https://vite.dev/) als Build-Tool
- Performance: Rendern nur bei Änderungen, Instancing für Partikel und Schlauchrippen, vorab tabellierte Partikelpfade, begrenzte Pixel-Ratio, keine Echtzeitschatten → läuft auf normalen Laptops und Tablets
- Responsives Layout (Desktop, Tablet quer/hoch)

## Entwicklung

```bash
npm install
npm run dev       # Entwicklungsserver
npm test          # Unit-Tests (Simulation, Inhalte)
npm run build     # Produktions-Build nach dist/
```

## Projektstruktur

```
src/
  core/            Viewer (Kamera, Picking, Schnitt, Explosion), Geometrie-Helfer, Vorschaubilder
  ui/              Lernmodus, Kurvendiagramm, DOM-Helfer
  devices/
    catalog.js     Gerätebibliothek
    ventilator/    components.js (Fachinhalte), model.js (3D), simulation.js (Physik),
                   animation.js (Funktionsanimation), tasks.js (Lernaufgaben)
tests/             node:test – Simulation und Inhaltskonsistenz
```

Ein neues Gerät wird als Modul unter `src/devices/<gerät>/` mit denselben Bausteinen angelegt und in `catalog.js` mit `status: 'interaktiv'` registriert.

## Quellen & Genauigkeit

Die Inhalte orientieren sich am allgemein dokumentierten Aufbau der Geräteklassen und an einschlägigen Normen (u. a. ISO 80601-2-12, IEC 60601-1-8, ISO 5359, ISO 7396-1, ISO 32, DIN 13260-2) sowie Lehrbüchern zur Beatmung (Rathgeber; Oczenski; Larsen/Ziegenfuß). Wo sich reale Geräte unterscheiden (Position der Flowsensoren, Turbine statt Druckluft, Sensorarchitektur), ist dies in der App vermerkt („Quellen & Genauigkeit“).
