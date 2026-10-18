import type { Metadata } from "next";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Datenschutz" };

export default function PrivacyPage() {
  return (
    <article>
      <h1>Datenschutzhinweise</h1>
      <Alert tone="warning" title="Vorlage – rechtlich nicht geprüft">
        Dieser Text ist eine technische Vorlage, die den tatsächlichen Datenfluss der Software beschreibt. Er ersetzt keine rechtliche Prüfung. Der
        Betreiber muss Verantwortlichen, Kontaktdaten, Rechtsgrundlagen und Speicherfristen ergänzen und prüfen lassen.
      </Alert>

      <h2>1. Verantwortlicher</h2>
      <p>[Name und Anschrift des Betreibers dieser Installation, E-Mail-Adresse – bitte ergänzen]</p>

      <h2>2. Welche Daten verarbeitet werden</h2>
      <ul>
        <li>Kontodaten: E-Mail-Adresse, Anzeigename, Passwort (nur als scrypt-Hash), Rolle, Kontostatus</li>
        <li>Profildaten: Gewicht, Größe, Berechnungsprofil, optional Geschlecht, Zeitzone; Historie der Profiländerungen</li>
        <li>Konsumdaten: erfasste Getränke mit Menge, Alkoholgehalt, Zeitpunkt und optionaler Notiz</li>
        <li>Nutzungs- und Sicherheitsdaten: Login-, Logout- und Aktivitätszeitpunkte, Sitzungen (Gerätekennung des Browsers, IP-Adresse), Aktivitätsprotokoll mit gekürzter IP-Adresse</li>
        <li>Optional: Push-Abonnement (Endpunkt des Push-Dienstes des Browsers), Community-Teilnahme und Pseudonym</li>
      </ul>

      <h2>3. Zwecke und Rechtsgrundlagen (zu prüfen)</h2>
      <ul>
        <li>Bereitstellung des Kontos und der Funktionen – Art. 6 Abs. 1 lit. b DSGVO</li>
        <li>
          Konsum- und Körperdaten können Gesundheitsdaten sein – Verarbeitung auf Grundlage der ausdrücklichen Einwilligung, Art. 9 Abs. 2 lit. a
          DSGVO (wird bei der Einrichtung eingeholt und protokolliert)
        </li>
        <li>Community-Ranking und Push-Benachrichtigungen – Einwilligung, Art. 6 Abs. 1 lit. a DSGVO; jederzeit widerrufbar</li>
        <li>Sicherheitsprotokoll und Missbrauchsschutz – berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO</li>
      </ul>

      <h2>4. Wer Zugriff hat</h2>
      <p>
        Deine Einträge sind nur für dich sichtbar. Administratoren sehen Kontodaten, Aktivitätszeitpunkte und aggregierte Zahlen (z. B. Anzahl der
        Einträge), aber keine einzelnen Konsumeinträge. Die Teilnahme am Community-Ranking ist voreingestellt; du kannst sie bei der Einrichtung und
        jederzeit unter „Community“ abwählen. Angezeigt wird ausschließlich deine Gesamtmenge unter deinem Anzeigenamen oder einem Pseudonym,
        und nur für angemeldete Benutzer dieser Installation.
      </p>

      <h2>5. Speicherort und Empfänger</h2>
      <p>
        Alle Daten liegen in der PostgreSQL-Datenbank dieser selbst betriebenen Installation. Es werden keine Analyse- oder Tracking-Dienste und
        keine externen Schriftarten oder CDNs eingebunden. Bei aktivierten Push-Benachrichtigungen übermittelt der Server verschlüsselte
        Nachrichten an den Push-Dienst deines Browsers (z. B. Apple, Google, Mozilla); diese enthalten keine Konsumdaten. Bei konfiguriertem
        E-Mail-Versand wird der Mailserver des Betreibers genutzt.
      </p>

      <h2>6. Speicherdauer (Vorschlag, zu prüfen)</h2>
      <ul>
        <li>Konto-, Profil- und Konsumdaten: bis zur Löschung des Kontos</li>
        <li>Sitzungen: bis zum Ablauf oder Logout</li>
        <li>Aktivitätsprotokoll: wird bei Kontolöschung pseudonymisiert; Betreiber sollte eine Frist festlegen (z. B. 12 Monate)</li>
        <li>Backups: gemäß Backup-Konzept des Betreibers (gelöschte Daten können bis zum Ablauf der Backup-Rotation in Sicherungen enthalten sein)</li>
      </ul>

      <h2>7. Deine Rechte</h2>
      <p>
        Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch und Widerruf erteilter Einwilligungen. Export und
        Kontolöschung kannst du selbst unter Einstellungen → Daten &amp; Datenschutz auslösen. Du hast außerdem das Recht auf Beschwerde bei einer
        Datenschutzaufsichtsbehörde.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Es wird ausschließlich ein technisch notwendiges Sitzungscookie (HttpOnly) gesetzt, dazu bei „Angemeldet bleiben = aus“ ein Hilfscookie.
        Keine Tracking-Cookies.
      </p>
    </article>
  );
}
