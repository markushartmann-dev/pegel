# Datenschutz im Betrieb – Checkliste für den Betreiber

> Dieses Dokument ist keine Rechtsberatung. Es beschreibt, was die Software technisch umsetzt, und welche organisatorischen Schritte für einen Betrieb in Deutschland noch zu prüfen sind.

## Technisch umgesetzt

| Anforderung | Umsetzung |
|---|---|
| Datenminimierung | Pflichtangaben: E-Mail, Anzeigename, Gewicht, Größe, Berechnungsprofil, Zeitzone. Geschlecht, Notizen, Push, Community optional |
| Einwilligung Art. 9 (Gesundheitsdaten) | Ausdrückliche Einwilligung im Onboarding, versioniert in `user_consent` |
| Community | Auf Wunsch des Betreibers standardmäßig **an** (Checkbox im Onboarding vorausgewählt, abwählbar), Pseudonym möglich, Widerruf sofort wirksam, Einwilligungshistorie. Achtung: Eine vorausgewählte Checkbox gilt nach DSGVO nicht als wirksame Einwilligung (EuGH „Planet49“) – für einen Betrieb über den Familien-/Freundeskreis hinaus wieder auf Opt-in umstellen (Default in `prisma/schema.prisma` und `onboarding-wizard.tsx`). |
| Push | Standard aus, Aktivierung nur per Klick, keine sensiblen Inhalte auf dem Sperrbildschirm |
| Zugriffsbeschränkung | Einträge nur für den Benutzer; Administratoren sehen Kontodaten, Aktivitätszeitpunkte und Aggregate |
| Auskunft / Datenübertragbarkeit | JSON-Export unter Einstellungen → Daten & Datenschutz |
| Löschung | Selbstlöschung (Passwort + Bestätigung) oder durch Administration; Cascade auf alle personenbezogenen Tabellen |
| Protokoll | Keine Passwörter/Tokens/Konsumdetails; IP gekürzt; bei Kontolöschung `actorId/targetUserId = NULL` (pseudonymisiert) |
| Sicherheit (Art. 32) | HTTPS (Reverse Proxy), sichere Cookies, Rate-Limits, CSP, Rollen, Container-Härtung, Backups mit Zugriffsbeschränkung |
| Keine Drittanbieter | Keine Tracker, Schriftarten lokal, keine CDNs |

## Vom Betreiber zu erledigen

1. **Datenschutzhinweise** (`src/app/(info)/datenschutz/page.tsx`): Verantwortlicher, Kontakt, ggf. Datenschutzbeauftragter, Rechtsgrundlagen, Speicherfristen, Empfänger (Push-Dienste, Mailserver), Betroffenenrechte, Beschwerderecht – juristisch prüfen lassen.
2. **Impressum** (`src/app/(info)/impressum/page.tsx`), sofern die Installation nicht rein privat genutzt wird.
3. **Aufbewahrungsfristen festlegen**, insbesondere für `audit_log` (Vorschlag: 12 Monate) und Backups (Rotation in `scripts/backup.sh`, `KEEP`). Löschung alter Protokolleinträge z. B. per Aufgabenplaner:
   `docker compose exec -T db psql -U pegel -d pegel -c "DELETE FROM audit_log WHERE \"createdAt\" < now() - interval '12 months';"`
4. **Verzeichnis von Verarbeitungstätigkeiten** (Art. 30) anlegen.
5. **Datenschutz-Folgenabschätzung** (Art. 35) prüfen – bei Gesundheitsdaten mehrerer Personen wahrscheinlich erforderlich, bei rein privater Nutzung im Haushalt ggf. nicht anwendbar (Haushaltsausnahme).
6. **Einwilligungstexte** prüfen und bei Änderungen `CONSENT_VERSION` in `src/server/services/profile.ts` erhöhen.
7. **Backups** verschlüsselt ablegen; gelöschte Konten bleiben bis zum Ablauf der Rotation in Sicherungen enthalten – in den Datenschutzhinweisen erwähnen.
8. **Zugriff** auf den Server und `.env` auf Administratoren beschränken; `AUTH_SECRET` und Datenbankpasswort regelmäßig prüfen.
9. **Community-Ranking:** ausschließlich für angemeldete Benutzer derselben Installation sichtbar. Eine Veröffentlichung im Internet ist nicht vorgesehen und wäre gesondert zu bewerten.
