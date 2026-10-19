import type { Metadata } from "next";
import { IosInstallGuide } from "@/features/help/ios-install-guide";

export const metadata: Metadata = { title: "Hilfe" };

export default function HelpPage() {
  return (
    <article>
      <h1>Hilfe &amp; Support</h1>
      <h2>Getränk erfassen</h2>
      <p>Unter „Erfassen“ ein Getränk antippen, Anzahl der Portionen wählen und bei Bedarf den Zeitpunkt anpassen. Für vergangene Tage im Kalender den Tag wählen und „Nachtragen“ nutzen.</p>
      <h2>Eigenes Getränk mit genauem Alkoholgehalt</h2>
      <p>Unter „Getränke“ → „Neu“ Name, Volumen und Alkoholgehalt vom Etikett eintragen. Archivierte Getränke bleiben in alten Einträgen erhalten.</p>
      <h2>Sparschwein</h2>
      <p>Für jeden abgeschlossenen Tag ohne erfasste Getränke wandern 5 € ins Sparschwein, für jede volle Woche am Stück 10 € extra und für jeden kompletten Kalendermonat 20 € extra. Der heutige Tag zählt ab Mitternacht. Das Sparschwein-Ranking auf der Community-Seite vergleicht die Teilnehmenden.</p>
      <h2 id="app-installieren">Als App aufs iPhone – Schritt für Schritt</h2>
      <p>So liegt Pegel wie eine normale App auf deinem Home-Bildschirm, startet im Vollbild und kann dich (wenn du willst) erinnern.</p>
      <IosInstallGuide />
      <h2>Android</h2>
      <p>In Chrome oder Edge oben rechts auf das Menü (⋮) tippen → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ → bestätigen.</p>
      <h2>Passwort vergessen</h2>
      <p>Ist E-Mail-Versand eingerichtet, über „Passwort vergessen“ auf der Anmeldeseite. Sonst erzeugt die Administration einen einmaligen Link.</p>
      <h2>Konto, Export und Löschung</h2>
      <p>Unter Einstellungen → „Daten &amp; Datenschutz“ kannst du alle Daten herunterladen oder dein Konto endgültig löschen.</p>
      <h2>Kontakt</h2>
      <p>Bei Fragen zu dieser Installation wende dich an die Administration bzw. den Betreiber (siehe Impressum).</p>
    </article>
  );
}
