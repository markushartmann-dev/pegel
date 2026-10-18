import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { ImprintContact, imprintConfigured } from "@/components/imprint-contact";

export const metadata: Metadata = { title: "Impressum" };

export default function ImprintPage() {
  if (!imprintConfigured()) {
    return (
      <article>
        <h1>Impressum</h1>
        <Alert tone="warning" title="Noch nicht eingerichtet">
          Der Betreiber dieser Installation hat noch keine Angaben hinterlegt. Einrichtung über die Variablen <code>IMPRINT_NAME</code>,{" "}
          <code>IMPRINT_STREET</code>, <code>IMPRINT_CITY</code> und <code>IMPRINT_EMAIL</code> in der <code>.env</code> (siehe README).
        </Alert>
      </article>
    );
  }
  return (
    <article>
      <h1>Impressum</h1>
      <h2>Angaben gemäß § 5 DDG</h2>
      <ImprintContact />
      <h2>Verantwortlich für den Inhalt</h2>
      <p>Siehe oben. Diese Anwendung ist ein privates, nicht kommerzielles Angebot.</p>
      <h2>Haftung</h2>
      <p>
        Die angezeigten Promillewerte sind rechnerische Schätzungen ohne Gewähr und keine medizinische oder rechtliche Auskunft. Sie dürfen nicht
        für die Entscheidung über das Führen von Fahrzeugen verwendet werden.
      </p>
    </article>
  );
}
