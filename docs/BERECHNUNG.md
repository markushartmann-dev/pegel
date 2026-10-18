# Berechnungsmodell

Implementierung: [`src/lib/calculations/alcohol.ts`](../src/lib/calculations/alcohol.ts), [`src/lib/calculations/widmark.ts`](../src/lib/calculations/widmark.ts), Tests in [`tests/unit/`](../tests/unit/). Die Berechnung läuft ausschließlich serverseitig (die Formularvorschau im Browser nutzt dieselbe Bibliothek nur zur Anzeige).

## 1. Reiner Alkohol

```
A [g] = V [ml] × (Alkoholgehalt [% vol] / 100) × 0,789 g/ml
```

0,789 g/ml ist die Dichte von Ethanol bei 20 °C. Gespeichert wird je Eintrag ein Snapshot (Name, Kategorie, Volumen, Alkoholgehalt, Gramm, Portionen), damit spätere Änderungen an einem Getränk alte Einträge nicht verändern. Gramm werden mit zwei Nachkommastellen gespeichert, angezeigt mit einer.

| Standardgetränk | Volumen | % vol | Gramm |
|---|---:|---:|---:|
| Bier klein | 200 ml | 5,0 | 7,9 |
| Bier 0,33 l | 330 ml | 5,0 | 13,0 |
| Bier 0,5 l | 500 ml | 5,0 | 19,7 |
| Sekt | 100 ml | 11,0 | 8,7 |
| Radler 0,5 l | 500 ml | 2,5 | 9,9 |
| Weizen 0,5 l | 500 ml | 5,4 | 21,3 |
| Wein 0,2 l | 200 ml | 12,0 | 18,9 |
| Schnaps 2 cl | 20 ml | 40,0 | 6,3 |
| Aperol Spritz | 150 ml | 9,2 | 10,9 |

Die Alkoholgehalte sind typische Startwerte. Eigene Getränke erlauben den genauen Wert vom Etikett; bei der Erfassung kann man Volumen und Alkoholgehalt zusätzlich nur für diesen Eintrag anpassen.

## 2. Verteilungsfaktor r

| Profil | r |
|---|---|
| Widmark, männlich | 0,68 |
| Widmark, weiblich | 0,55 |
| Seidl et al. (2000), männlich | 0,31608 − 0,004821 · m + 0,004632 · h |
| Seidl et al. (2000), weiblich | 0,31223 − 0,006446 · m + 0,004466 · h |
| Eigener Faktor | 0,40 – 0,90 |

m = Gewicht in kg, h = Größe in cm. Ergebnisse werden auf 0,40–0,90 begrenzt. Das Berechnungsprofil ist bewusst vom (optionalen) Geschlecht getrennt: Es beschreibt die Körperzusammensetzung, nicht die Identität. Die Größe wird gespeichert, geht aber nur in die Seidl-Formeln ein.

Jede Profiländerung erzeugt eine unveränderliche `UserProfileRevision` mit Gültigkeitsbeginn. Der Tagesverlauf im Kalender verwendet das am jeweiligen Tag gültige Profil.

## 3. Zeitabhängiges Modell für mehrere Getränke

Grundgleichung (ein Getränk, sofortige Aufnahme): `c(t) = A / (r · m) − β · t`.

Für mehrere Getränke wird **nicht** die Tagesmenge durch das Gewicht geteilt. Stattdessen:

1. Jedes Getränk i trägt `Δcᵢ = Aᵢ / (r · m)` Promille bei.
2. Der Beitrag wird ab dem Konsumzeitpunkt **linear über D Minuten** aufgenommen (`MODEL_ABSORPTION_MINUTES`, Standard 30). D = 0 entspricht der klassischen sofortigen Aufnahme.
3. Abbau mit konstanter Rate **β** (`MODEL_BETA_PER_HOUR`, Standard 0,15 ‰/h, Kinetik 0. Ordnung) – auf die **Gesamtkonzentration**, nur solange sie > 0 ist. Negative Werte gibt es nicht; ist der Wert 0 und die Aufnahme kleiner als β, bleibt er 0.

Da Aufnahme und Abbau stückweise konstant sind, ist der Verlauf stückweise linear. Die Bibliothek berechnet die Stützstellen exakt (Ereignisse: Beginn/Ende jeder Resorptionsphase, Nulldurchgänge) statt numerisch zu integrieren. Werte zwischen Stützstellen werden linear interpoliert.

- Alle Zeiten sind absolute Zeitpunkte (UTC); Zeitzonen und Sommerzeit beeinflussen das Modell nicht. Eine Stunde ist immer eine echte Stunde.
- Berücksichtigt werden Einträge der letzten 72 Stunden (genug, um jede realistische Menge abzubauen).
- Einträge in der Zukunft (mehr als 1 Minute) werden ignoriert und markiert; neue Einträge dürfen höchstens 10 Minuten in der Zukunft liegen.
- Eingaben werden sortiert; die Reihenfolge der Eingabe spielt keine Rolle.

## 4. Ausgabe

- **Aktueller Modellwert** mit **Spanne**: niedrig = r + 10 % und β = 0,20 ‰/h; hoch = r − 10 % und β = 0,10 ‰/h.
- **Höchster Modellwert** und Zeitpunkt (kann bei laufender Resorption in der Zukunft liegen).
- **Rechnerischer Nullzeitpunkt** (Ende der letzten Stützstelle) mit Spanne, verbleibende Dauer auf 5 Minuten gerundet.
- **Hinweise:** Resorption läuft, Wert steigt, Einträge in der Zukunft ignoriert, eigener Faktor, sehr hoher Wert (≥ 2,0 ‰ – Modell besonders ungenau, Notrufhinweis).
- Status `no_data` (keine Einträge in 72 h → keine Prognose), `zero` (Modellwert bereits 0), `unavailable` (Profil fehlt/ungültig).
- Darstellung mit einer Nachkommastelle; Werte unter 0,05 ‰ erscheinen als „< 0,1 ‰“.

## 5. Nicht berücksichtigt

Mageninhalt, Trinkgeschwindigkeit innerhalb eines Getränks, Resorptionsdefizit, Medikamente, Leberfunktion, Gewöhnung, individuelle Abweichungen von r und β, Messfehler bei Gewicht und Getränkeangaben. Deshalb: **Schätzung, keine Messung – nie zur Entscheidung über das Fahren verwenden.**

## 6. Tagesgrenzen und Statistik

Ein Tag ist der Kalendertag in der Zeitzone des Benutzers (00:00–24:00 lokal; an Umstellungstagen 23 bzw. 25 Stunden). Lokale Eingaben, die es wegen der Sommerzeitumstellung nicht gibt (z. B. 02:30 am letzten Märzsonntag), werden um die Lücke nach vorn verschoben; doppelt vorkommende Uhrzeiten im Oktober gelten als erstes Vorkommen.
