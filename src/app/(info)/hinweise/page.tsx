import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { env } from "@/server/env";
import { t } from "@/i18n";

export const metadata: Metadata = { title: "Modell & Hinweise" };

export default function ModelInfoPage() {
  const beta = env.model.betaPerHour.toLocaleString("de-DE");
  return (
    <article>
      <h1>Berechnungsmodell und wichtige Hinweise</h1>
      <Alert tone="danger" title="Keine Messung – nicht für Entscheidungen über die Fahrtüchtigkeit">
        {t.estimate.disclaimerLong} Bereits ab 0,3 ‰ kann man sich in Deutschland strafbar machen, wenn Ausfallerscheinungen vorliegen; für
        Fahranfänger gilt 0,0 ‰. Wer getrunken hat, fährt nicht.
      </Alert>

      <h2>1. Menge reinen Alkohols</h2>
      <p>
        Für jeden Eintrag wird berechnet: <code>A [g] = Volumen [ml] × Alkoholgehalt [% vol] / 100 × 0,789 g/ml</code>. Beispiel: 500 ml Bier mit
        5 % vol enthalten rechnerisch rund 19,7 g reinen Alkohol. Die Werte der Standardgetränke sind typische Startwerte – für genaue Werte eigene
        Getränke mit dem Etikettwert anlegen.
      </p>

      <h2>2. Widmark-Grundgleichung</h2>
      <p>
        <code>c = A / (r × m) − β × t</code> mit c = Modellwert in Promille, A = Alkohol in Gramm, r = Verteilungsfaktor, m = Körpergewicht in kg,
        β = Abbaurate in ‰ pro Stunde und t = Zeit in Stunden.
      </p>
      <ul>
        <li>r = 0,68 (Widmark, männliches Berechnungsprofil) bzw. 0,55 (weibliches Berechnungsprofil)</li>
        <li>
          Alternativ Seidl et al. (2000): männlich r = 0,31608 − 0,004821 × m + 0,004632 × h; weiblich r = 0,31223 − 0,006446 × m + 0,004466 × h (h =
          Größe in cm), begrenzt auf 0,40–0,90
        </li>
        <li>oder ein eigener Faktor zwischen 0,40 und 0,90</li>
        <li>β = {beta} ‰/h (auf diesem Server konfiguriert)</li>
      </ul>

      <h2>3. Mehrere Getränke und zeitlicher Verlauf</h2>
      <p>Pegel teilt nicht einfach die Tagesmenge durch das Gewicht, sondern rechnet zeitabhängig:</p>
      <ul>
        <li>Jedes Getränk trägt A / (r × m) Promille bei.</li>
        <li>
          Dieser Beitrag wird ab dem Konsumzeitpunkt linear über {env.model.absorptionMinutes} Minuten aufgenommen (vereinfachte Resorption).
        </li>
        <li>Abgebaut wird mit konstanter Rate β, und zwar von der Gesamtkonzentration, solange sie über 0 liegt. Negative Werte gibt es nicht.</li>
        <li>Einträge der letzten 72 Stunden werden berücksichtigt; Einträge in der Zukunft werden ignoriert und markiert.</li>
        <li>Gerundet wird erst bei der Anzeige (eine Nachkommastelle, Werte unter 0,05 ‰ als „&lt; 0,1 ‰“).</li>
      </ul>

      <h2>4. Unsicherheit</h2>
      <p>
        Neben dem Modellwert zeigt Pegel eine Spanne: Sie ergibt sich, wenn r um ±10 % abweicht und β zwischen 0,10 und 0,20 ‰/h liegt. Auch die
        Spanne ist keine Garantie. Hinweise erscheinen insbesondere, wenn die Resorption noch läuft, der Wert sehr hoch ist oder ein eigener Faktor
        verwendet wird.
      </p>
      <p>Nicht berücksichtigt werden u. a.: Mageninhalt, Trinkgeschwindigkeit innerhalb eines Getränks, Resorptionsdefizit, Medikamente, Leberfunktion, Gewöhnung, Tagesform und Messabweichungen bei Gewicht oder Getränkeangaben.</p>

      <h2>5. Prognose bis 0,0 ‰</h2>
      <p>
        Der angezeigte Zeitpunkt ist der Moment, an dem der <em>Modellwert</em> rechnerisch 0 erreicht. Er sagt nicht aus, dass zu diesem Zeitpunkt
        tatsächlich kein Alkohol mehr im Blut ist, und darf nicht als Freigabe für das Führen eines Fahrzeugs verstanden werden.
      </p>

      <h2>6. Hilfe</h2>
      <p>
        Wenn du dir Sorgen um deinen Alkoholkonsum machst: Das Infotelefon zur Suchtvorbeugung der BZgA erreichst du unter 0221 892031, die Sucht &amp;
        Drogen Hotline unter 01806 313031. In Notfällen: 112.
      </p>
    </article>
  );
}
