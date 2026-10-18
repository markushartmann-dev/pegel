import type { Metadata } from "next";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Impressum" };

export default function ImprintPage() {
  return (
    <article>
      <h1>Impressum</h1>
      <Alert tone="warning" title="Vorlage – bitte ergänzen">
        Ein Impressum ist nur erforderlich, wenn die Installation geschäftsmäßig bzw. öffentlich angeboten wird. Für eine rein private Nutzung im
        Familien- oder Freundeskreis kann es entfallen. Angaben bitte prüfen lassen.
      </Alert>
      <p>[Name]</p>
      <p>[Anschrift]</p>
      <p>[E-Mail-Adresse]</p>
    </article>
  );
}
