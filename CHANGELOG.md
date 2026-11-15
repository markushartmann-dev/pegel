# Changelog

Alle nennenswerten Änderungen an Pegel. Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

**Aktualisieren einer bestehenden Installation:** neuen Stand holen (`git pull` oder Dateien kopieren), dann `sh scripts/update.sh`. Datenbankmigrationen laufen dabei automatisch.

## [Unveröffentlicht]

## [1.5.1] – 2026-11-15

### Geändert
- **Community:** Inaktive Teilnehmende werden schon nach 7 statt 10 Tagen ausgeblendet (`COMMUNITY_INACTIVE_DAYS`, Standard jetzt 7). Die Datenschutzhinweise nennen die eingestellte Frist.
- **README-Screenshots erneuert:** aktuelle Navigation, neue Bilder für Neuigkeiten, Getränke-Vorschläge sowie Getränke und Neuigkeiten auf dem Handy.

## [1.5.0] – 2026-11-15

### Hinzugefügt
- **Eigene Getränke für alle vorschlagen:** Über das Megafon-Symbol unter „Getränke“ lässt sich ein eigenes Getränk als Standardgetränk vorschlagen. Offene Vorschläge sind am Getränk markiert und können zurückgezogen werden.
- **Freigabe durch die Administration:** Neuer Bereich Administration → Vorschläge (mit Zähler). Freigegebene Getränke werden sofort für alle verfügbar, bestehende Einträge bleiben erhalten. Bei Ablehnung sieht die Person die Begründung und kann nach einer Korrektur erneut vorschlagen. Alles wird protokolliert.

### Geändert
- **Community ohne Karteileichen:** Wer seit 10 Tagen (ab 1.5.1: 7 Tagen) weder angemeldet noch aktiv war, wird im Mengen- und Sparschwein-Ranking ausgeblendet und erscheint mit der nächsten Anmeldung automatisch wieder. Die Frist ist über `COMMUNITY_INACTIVE_DAYS` einstellbar.
- **Neuigkeiten, Hilfe und Rechtliches:** Die Kopfzeile mit „Zur App“ bleibt beim Scrollen stehen.

### Behoben
- **Handy-Darstellung:** Alle Seiten passen bei 100 % Zoom auf das Display, ohne seitliches Scrollen. Lange Namen und Beschreibungen brechen um, statt abgeschnitten zu werden (u. a. Getränke, Einträge, Community). Auswahlleisten brechen um, Benutzerliste und Aktivitätsprotokoll erscheinen auf dem Handy als Karten.

## [1.4.0] – 2026-11-04

### Hinzugefügt
- **Neuigkeiten in der App:** Die Seite `/neuigkeiten` zeigt alle Versionen mit ihren Änderungen, direkt aus der `CHANGELOG.md` erzeugt. Erreichbar über die Navigation und über die Versionsnummer in der Fußzeile.

## [1.3.0] – 2026-11-04

### Hinzugefügt
- **Zeitzone auf Reisen:** Die App übernimmt die Zeitzone des Geräts automatisch und meldet die Umstellung kurz. Uhrzeiten, „heute“ und Erinnerungen folgen so dem Aufenthaltsort. Abschaltbar unter Einstellungen → Profil.
- **Zeitzone je Eintrag:** Beim Erfassen und Bearbeiten wählbar, z. B. zum Nachtragen einer Reise. Beim Wechsel bleibt der tatsächliche Zeitpunkt gleich, die Ortszeit wird umgerechnet.
- **Neue Standardgetränke:** Bier (400 ml, 5,0 %), Caipirinha (40 ml, 40,0 %), Hefe-Weißbier Alkoholfrei (500 ml, 0,5 %), Jack Daniel's & Coca-Cola (330 ml, 10,0 %). Identische eigene Getränke werden beim Update archiviert, damit nichts doppelt zur Auswahl steht; bestehende Einträge bleiben unverändert.

### Geändert
- Einträge zählen in Kalender, Statistik und Sparschwein zum **Kalendertag ihrer Ortszeit** und zeigen diese an, bei abweichender Zeitzone mit Ort, z. B. „20:00 Uhr (London)“.

## [1.2.0] – 2026-10-19

### Hinzugefügt
- **Bebilderte Anleitung „Als App aufs iPhone“** in sechs Schritten (Safari → Teilen → Zum Home-Bildschirm → Hinzufügen → Start → optional Mitteilungen erlauben) in der Hilfe (`/hilfe#app-installieren`) und auf der Registrierungsseite. Eigene, an das Farbschema angepasste Illustrationen; dazu eine Kurzanleitung für Android.
- **Einleitung auf der Registrierungsseite:** worum es geht und was es bringt, sechs Vorteils-Kacheln, aufklappbare Screenshots und Link zum GitHub-Projekt. Auf dem Handy mit Sprunglink zum Formular. Die Anmeldeseite verlinkt „Was ist Pegel?“.
- **Impressum und Verantwortlicher** (Datenschutzhinweise) aus der `.env` (`IMPRINT_NAME`, `IMPRINT_STREET`, `IMPRINT_CITY`, `IMPRINT_COUNTRY`, `IMPRINT_EMAIL`, `IMPRINT_PHONE`) – persönliche Angaben gehören damit nicht in den Quellcode. Die E-Mail-Adresse ist vor der Cloudflare-Email-Obfuscation geschützt.

### Geändert
- **Untere Leiste auf dem Handy:** „Erfassen“ steht jetzt in der Mitte (Übersicht · Kalender · Erfassen · Statistik · Mehr).
- Bei geschlossener Registrierung weist die Registrierungsseite auf Einladungslinks der Administration hin.

## [1.1.0] – 2026-10-18

### Hinzugefügt
- **Administration: Benutzer anlegen** – auch bei geschlossener Registrierung. Wahlweise mit **Einladungslink** (7 Tage gültig, einmalig verwendbar; die Person legt ihr Passwort selbst fest) oder mit **Startpasswort**. Protokolliert als „Admin: Konto angelegt“.
- **Lizenz:** MIT.

## [1.0.0] – 2026-10-18

Erste veröffentlichte Version.

### Hinzugefügt
- **Erfassung** von Getränken als Kacheln mit Portionen, Zeitpunkt, Notiz und Nachtragen für vergangene Tage; Schutz vor doppelt abgeschickten Einträgen. Standardgetränke (Bier, Weizen, Wein, Sekt, Radler, Schnaps, Aperol Spritz) und eigene Getränke mit Etikettwerten.
- **Promille-Schätzung** nach einem zeitabhängigen Widmark-Modell (Resorption, Abbau, mehrere Getränke) mit Unsicherheitsspanne, Verlaufsdiagramm und rechnerischem Nullzeitpunkt; durchgängiger Hinweis „keine Messung, nicht zum Fahren“.
- **Übersicht, Statistik, Kalender und Verlauf** mit Tages-, Wochen- und Monatswerten, Kategorien, Wochentagen und Vergleich zum Vorzeitraum.
- **Sparschwein:** 5 € je Tag ohne erfasste Getränke, +10 € je volle Woche am Stück, +20 € je kompletter Kalendermonat (über `SAVINGS_*` einstellbar).
- **Community-Ranking** nach Sparschwein und nach Menge – standardmäßig aktiv, im Onboarding und jederzeit abwählbar, Anzeigename oder Pseudonym.
- **Konten und Sitzungen** mit Better Auth: Datenbanksitzungen, „Angemeldet bleiben“, Rate-Limits, Kontosperre nach Fehlversuchen, Passwort-Reset (per E-Mail oder Admin-Link), Onboarding mit Berechnungsprofil und Einwilligungen.
- **Administration:** Benutzerübersicht, Aktivieren/Deaktivieren, Rollen, Sitzungen widerrufen, Reset-Links, Aktivitäts- und Sicherheitsprotokoll.
- **Datenschutz:** Datenexport (JSON), Kontolöschung, keine Tracker oder externen Ressourcen.
- **Oberfläche:** Deutsch, responsiv, Hell/Dunkel/System, fünf Farbschemata, installierbar als PWA, optionale Push-Erinnerungen (VAPID).
- **Betrieb:** Docker Compose mit PostgreSQL 17, kontrollierten Migrationen, Healthchecks, Backup-, Restore- und Update-Skripten; Unit-, Integrations- und E2E-Tests.

### Behoben (vor der Veröffentlichung)
- Zeitstempel wurden verschoben gespeichert, wenn PostgreSQL nicht in UTC läuft (z. B. `TZ=Europe/Berlin`). Die App verbindet sich jetzt immer mit `TimeZone=UTC`; eine Migration korrigiert bestehende Daten einmalig.
- Hinter Cloudflare wird die Client-IP aus `CF-Connecting-IP` gelesen, damit Rate-Limits nicht über `X-Forwarded-For` umgangen werden können.

[Unveröffentlicht]: https://github.com/markushartmann-dev/pegel/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/markushartmann-dev/pegel/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/markushartmann-dev/pegel/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/markushartmann-dev/pegel/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/markushartmann-dev/pegel/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/markushartmann-dev/pegel/releases/tag/v1.0.0
