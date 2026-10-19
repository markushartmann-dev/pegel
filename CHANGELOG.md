# Changelog

Alle nennenswerten Änderungen an Pegel. Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

**Aktualisieren einer bestehenden Installation:** neuen Stand holen (`git pull` oder Dateien kopieren), dann `sh scripts/update.sh`. Datenbankmigrationen laufen dabei automatisch.

## [Unveröffentlicht]

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

[Unveröffentlicht]: https://github.com/markushartmann-dev/pegel/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/markushartmann-dev/pegel/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/markushartmann-dev/pegel/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/markushartmann-dev/pegel/releases/tag/v1.0.0
