# Pegel – Alkohol-Tagebuch

![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white) ![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql&logoColor=white) ![Prisma 7](https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white) ![PWA](https://img.shields.io/badge/PWA-installierbar-5a0fc8) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

> *Self-hosted alcohol diary (German UI): log drinks, statistics, calendar, a transparent Widmark-based BAC **estimate**, a savings jar for alcohol-free days, community ranking, admin area, PWA with push. Runs with `docker compose up -d --build`.*

Selbst gehostete WebApp zum Erfassen des eigenen Alkoholkonsums: persönliche Getränke, Dashboard mit Statistiken, Kalender, transparente Promille-**Schätzung** nach einem zeitabhängigen Widmark-Modell, Community-Ranking mit Sparschwein (Geld für alkoholfreie Tage), Administration mit Aktivitätsprotokoll, fünf Farbschemata mit Hell/Dunkel/System, installierbar als PWA mit optionalen Push-Erinnerungen.

![Übersicht mit Modellschätzung, Sparschwein und 30-Tage-Verlauf](docs/screenshots/01-dashboard.png)

<details>
<summary><strong>Weitere Screenshots</strong> (Demo-Daten, fiktive Personen)</summary>

| | |
|---|---|
| ![Getränk erfassen](docs/screenshots/02-erfassen.png) | ![Kalender mit Tagesverlauf](docs/screenshots/03-kalender.png) |
| **Erfassen** – Kacheln, Portionen, Zeitpunkt | **Kalender** – Monat/Woche, Tagesdetails und Modellverlauf |
| ![Statistik](docs/screenshots/04-statistik.png) | ![Community und Sparschwein](docs/screenshots/07-community.png) |
| **Statistik** – Zeiträume, Wochentage, Kategorien, Wochen/Monate | **Community** – Sparschwein-Ranking und Mengenvergleich |
| ![Eigene Getränke](docs/screenshots/06-getraenke.png) | ![Verlauf](docs/screenshots/05-verlauf.png) |
| **Getränke** – eigene Getränke, Favoriten, Archiv | **Verlauf** – Filter und Seitennavigation |
| ![Administration](docs/screenshots/10-admin-benutzer.png) | ![Aktivitätsprotokoll](docs/screenshots/11-admin-protokoll.png) |
| **Administration** – Benutzer, Status, Aktivität | **Aktivitätsprotokoll** – Sicherheits- und Systemereignisse |
| ![Onboarding](docs/screenshots/15-onboarding-profil.png) | ![Darstellung](docs/screenshots/08-darstellung.png) |
| **Onboarding** – Berechnungsprofil mit Erklärung | **Darstellung** – Hell/Dunkel/System, 5 Farbschemata |

**Farbschemata**

| Ocean | Sunset | Forest | Neutral (hell) |
|---|---|---|---|
| ![Ocean](docs/screenshots/20-ocean-dashboard.png) | ![Sunset](docs/screenshots/21-sunset-statistik.png) | ![Forest](docs/screenshots/22-forest-community.png) | ![Neutral](docs/screenshots/23-neutral-hell-dashboard.png) |

**Smartphone**

| | | | |
|---|---|---|---|
| ![Mobil Übersicht](docs/screenshots/30-mobil-dashboard.png) | ![Mobil Erfassen](docs/screenshots/31-mobil-erfassen.png) | ![Mobil Kalender](docs/screenshots/32-mobil-kalender.png) | ![Mobil Community](docs/screenshots/33-mobil-community.png) |

Neu erzeugen: Demo-Server starten (`npm run build`, dann `E2E_PORT=3200 node scripts/e2e-server.mjs`), Demo-Daten laden (`DEMO_URL=http://localhost:3200 DATABASE_URL=postgresql://pegel:pegel@127.0.0.1:54332/pegel_e2e node scripts/demo-data.mjs`) und `DEMO_URL=http://localhost:3200 node scripts/screenshots.mjs` ausführen.

</details>

> **Wichtig:** Alle Promillewerte sind rechnerische Schätzungen. Sie ersetzen keine Atem- oder Blutalkoholmessung und sind **nicht** geeignet, um über das Führen von Fahrzeugen zu entscheiden. Die App zeigt diesen Hinweis dauerhaft an.

## Funktionen

- **Erfassen in Sekunden:** Standardgetränke als Kacheln (Bier, Wein, Sekt, Radler, Aperol Spritz …), eigene Getränke mit Etikettwerten, Portionen, Zeitpunkt, Notiz, Nachtragen für vergangene Tage. Schutz vor Doppel-Einträgen.
- **Promille-Schätzung:** zeitabhängiges Widmark-Modell mit Resorption und Abbau, mehreren Getränken, Unsicherheitsspanne und rechnerischem Nullzeitpunkt – inkl. Verlaufsdiagramm ([Modell](docs/BERECHNUNG.md)).
- **Statistik & Kalender:** Tages-, Wochen- und Monatsübersichten, Kategorien, Wochentage, Vergleich mit dem Vorzeitraum; Monats-/Wochenkalender mit Tagesdetails.
- **Sparschwein:** 5 € je Tag ohne Alkohol, +10 € je volle Woche am Stück, +20 € je ganzer Monat (konfigurierbar).
- **Community:** Ranking nach Sparschwein und nach Menge, mit Anzeigename oder Pseudonym, jederzeit abwählbar.
- **Administration:** Benutzer aktivieren/deaktivieren, Rollen, Sitzungen widerrufen, Reset-Links, Aktivitäts- und Sicherheitsprotokoll.
- **Sicherheit & Datenschutz:** Datenbanksitzungen mit „Angemeldet bleiben“, Rate-Limits, CSP, CSRF-Schutz, Datenexport und Kontolöschung, keine Tracker.
- **Oberfläche:** Deutsch, responsiv, Hell/Dunkel/System und 5 Farbschemata, installierbar als PWA, optionale Push-Erinnerungen.

---

## Inhalt

1. [Schnellstart mit Docker](#1-schnellstart-mit-docker)
2. [HTTPS, Reverse Proxy und Synology](#2-https-reverse-proxy-und-synology)
3. [Konfiguration](#3-konfiguration)
4. [Befehle für den Betrieb](#4-befehle-für-den-betrieb)
5. [Backup und Wiederherstellung](#5-backup-und-wiederherstellung)
6. [Anmeldung und Sitzungen](#6-anmeldung-und-sitzungen)
7. [PWA und Push-Benachrichtigungen](#7-pwa-und-push-benachrichtigungen)
8. [Sicherheit](#8-sicherheit)
9. [Datenschutz (DSGVO)](#9-datenschutz-dsgvo)
10. [Entwicklung und Tests](#10-entwicklung-und-tests)
11. [Architektur und Projektstruktur](#11-architektur-und-projektstruktur)
12. [Bekannte Grenzen](#12-bekannte-grenzen)

---

## 1. Schnellstart mit Docker

Voraussetzungen: Docker mit Compose v2, ca. 3 GB freier RAM für den Build (Next.js), ca. 1,5 GB Speicher für Images.

```bash
cp .env.example .env
# Pflichtwerte setzen (Beispiele zum Erzeugen):
#   AUTH_SECRET:        openssl rand -base64 48
#   POSTGRES_PASSWORD:  openssl rand -hex 24
#   APP_URL:            Adresse, unter der die App im Browser aufgerufen wird
docker compose up -d --build
```

Danach `APP_URL` im Browser öffnen und registrieren. **Das erste Konto wird automatisch Administrator.** Anschließend `REGISTRATION_ENABLED=false` setzen, wenn sich niemand Fremdes registrieren soll, und `docker compose up -d` ausführen.

Was beim Start passiert:

| Service | Aufgabe |
|---|---|
| `db` | PostgreSQL 17, Daten unter `./data/postgres`, nur im internen Docker-Netz erreichbar, Healthcheck `pg_isready` |
| `migrate` | Einmaliger Lauf: `prisma migrate deploy` + Seed der Standardgetränke, beendet sich danach („Exited (0)“ ist korrekt) |
| `app` | Next.js-Server (Standalone, Benutzer `pegel`, read-only Dateisystem), startet erst nach erfolgreicher Migration, Healthcheck `/api/health` |

Die App benötigt beim ersten Start **keinen** externen Dienst. E-Mail und Push sind optional.

## 2. HTTPS, Reverse Proxy und Synology

Prüfen: `http://<host>:1717/api/health` liefert `{"status":"ok"}`.

**Empfohlen: HTTPS** über einen Reverse Proxy (z. B. Synology DSM → Anmeldeportal → Reverse Proxy, Nginx Proxy Manager, Traefik, Caddy) oder einen **Cloudflare Tunnel**:

| Quelle | Ziel |
|---|---|
| HTTPS, `pegel.example.org`, Port 443 | HTTP, `<host>`, Port 1717 |

```dotenv
APP_URL=https://pegel.example.org
COOKIE_SECURE=true
```

Dann `docker compose up -d`. Erst mit HTTPS sind PWA-Installation (inkl. iPhone) und Push möglich. Die App ist danach nur noch über diese Adresse nutzbar (sichere Cookies werden über HTTP nicht gesetzt).

**Cloudflare:** Rocket Loader und Email Address Obfuscation für den Hostnamen deaktivieren (z. B. per Configuration Rule) – beide fügen Skripte ein, die die Content Security Policy blockiert. Die App liest die Client-IP aus `CF-Connecting-IP`.

**Nur LAN ohne HTTPS** (zum Ausprobieren): `APP_URL=http://<host>:1717` und `COOKIE_SECURE=false`. Alle Kernfunktionen laufen, aber ohne Service Worker/Push. So bitte nicht ins Internet freigeben.

**Synology:** Der Container Manager legt Bind-Mount-Ordner nicht selbst an („Bind mount failed: … does not exist“). Vor dem ersten Start im Projektordner ausführen:

```bash
mkdir -p data/postgres backups && chmod 700 data/postgres backups
```

Der Build braucht einige Minuten und ca. 2–3 GB RAM. Die Images werden lokal gebaut (`pegel:local`, `pegel-migrate:local`).

## 3. Konfiguration

Alle Einstellungen über `.env` (Vorlage: [.env.example](.env.example)). Secrets stehen nie im Quellcode oder Image.

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `APP_URL` | ja | Exakte Adresse im Browser (Cookies, CSRF-Prüfung, Links) |
| `TRUSTED_ORIGINS` | – | Weitere erlaubte Origins, kommagetrennt |
| `APP_PORT` | – | Host-Port (Standard 1717) |
| `AUTH_SECRET` | ja | ≥ 32 zufällige Zeichen; Änderung meldet alle Benutzer ab |
| `POSTGRES_USER/PASSWORD/DB` | ja (Passwort) | Datenbankzugang |
| `COOKIE_SECURE` | – | `true` (Standard). Nur für HTTP im LAN auf `false` |
| `SESSION_MAX_AGE_DAYS` | – | Gültigkeit „Angemeldet bleiben“ (Standard 30) |
| `SESSION_UPDATE_AGE_HOURS` | – | Verlängerung bei Aktivität spätestens alle x Stunden (Standard 24) |
| `REGISTRATION_ENABLED` | – | Offene Registrierung (`true`/`false`) |
| `DEFAULT_TIMEZONE` | – | Standard-Zeitzone neuer Konten |
| `MODEL_BETA_PER_HOUR` | – | Abbaurate β (Standard 0,15 ‰/h) |
| `MODEL_ABSORPTION_MINUTES` | – | Resorptionsdauer je Getränk (Standard 30) |
| `SAVINGS_PER_DAY` / `SAVINGS_WEEK_BONUS` / `SAVINGS_MONTH_BONUS` | – | Sparschwein in Euro: je Tag ohne Eintrag (5), je volle Woche am Stück (10), je kompletter Kalendermonat (20) |
| `SMTP_*` | – | Optionaler E-Mail-Versand (Bestätigung, Passwort-Reset) |
| `VAPID_*` | – | Optionale Web-Push-Schlüssel |

## 4. Befehle für den Betrieb

Alle Befehle im Projektordner (dort, wo `compose.yaml` liegt).

```bash
docker compose up -d --build        # starten / nach Änderungen neu bauen
docker compose stop                 # stoppen (Daten bleiben)
docker compose down                 # Container entfernen (Daten in ./data bleiben)
docker compose logs -f app          # Logs ansehen
docker compose ps                   # Status inkl. Healthchecks
sh scripts/update.sh                # Backup → Build → Migration → Neustart
docker compose run --rm migrate     # Migrationen manuell ausführen
sh scripts/verify-persistence.sh    # prüft, dass Daten einen Neustart überstehen
```

**Aktualisieren:** neuen Quellcode in den Ordner kopieren (oder `git pull`), dann `sh scripts/update.sh`. Migrationen sind versioniert (`prisma/migrations`) und laufen bei jedem Start kontrolliert vor der App; schlägt eine Migration fehl, startet die App nicht.

**Neue Migration (Entwicklung):** Schema in `prisma/schema.prisma` ändern, `npm run db:migrate:dev -- --name beschreibung`, Ordner `prisma/migrations/...` mit committen.

## 5. Backup und Wiederherstellung

```bash
sh scripts/backup.sh                                  # Dump nach ./backups, behält 14 Stände
KEEP=30 sh scripts/backup.sh                          # andere Aufbewahrung
sh scripts/restore.sh backups/pegel-20261018-030000.dump
```

- `backup.sh` erzeugt mit `pg_dump` einen konsistenten Dump im laufenden Betrieb und prüft ihn mit `pg_restore --list`.
- `restore.sh` fragt nach, sichert vorher den aktuellen Stand, stoppt die App, spielt das Backup in einer Transaktion ein und startet neu.
- **Automatisch:** per Cron bzw. Synology-Aufgabenplaner täglich `cd <projektordner> && sh scripts/backup.sh` und den Ordner `backups/` in die reguläre Datensicherung (z. B. Hyper Backup) aufnehmen. Den Ordner `data/postgres` bitte **nicht** im laufenden Betrieb als Dateikopie sichern – dafür ist der Dump da.
- Backups enthalten personenbezogene Gesundheitsdaten: Zugriffsrechte (`chmod 700 backups`) und verschlüsselte Sicherungsziele verwenden.

## 6. Anmeldung und Sitzungen

Umgesetzt mit [Better Auth](https://www.better-auth.com) (aktiv gepflegte Auth-Bibliothek für Next.js) und Datenbanksitzungen:

- Passwörter als scrypt-Hash, Mindestlänge 10 Zeichen.
- Sitzungs-Token: zufällig, in der Tabelle `session`, Cookie `pegel.session_token` mit `HttpOnly`, `SameSite=Lax`, bei HTTPS `Secure` (Präfix `__Secure-`). Keine Tokens im `localStorage`.
- **„Angemeldet bleiben“ aktiv:** Cookie mit Ablaufdatum (`SESSION_MAX_AGE_DAYS`, Standard 30 Tage). Bei Nutzung wird die Sitzung gleitend verlängert (höchstens alle `SESSION_UPDATE_AGE_HOURS`). Nach 30 Tagen ohne Nutzung ist eine neue Anmeldung nötig.
- **„Angemeldet bleiben“ aus:** Sitzungscookie ohne Ablaufdatum – endet beim Schließen des Browsers; serverseitig spätestens nach 24 h.
- **Unbegrenzte Anmeldung gibt es bewusst nicht.** Wer „nie abmelden“ möchte, kann `SESSION_MAX_AGE_DAYS` erhöhen (max. 365); jede Sitzung bleibt widerrufbar.
- Neue Sitzung bei jedem Login (Schutz gegen Session-Fixation); Passwortänderung und -reset beenden die anderen bzw. alle Sitzungen.
- Widerruf: Benutzer unter *Einstellungen → Sicherheit* (einzeln oder alle anderen), Administratoren pro Benutzer. Da kein Cookie-Cache verwendet wird, wirkt ein Widerruf sofort.
- Deaktivierte Konten können keine neue Sitzung starten; bestehende Sitzungen werden beim Deaktivieren gelöscht.
- Brute-Force-Schutz: datenbankgestützte Rate-Limits (Login 10/min, Registrierung 10/h, Reset 5/h pro IP) und Kontosperre für 15 Minuten nach 8 Fehlversuchen.
- Passwort vergessen: mit SMTP per E-Mail-Link (60 min). Ohne SMTP erzeugt die Administration im Benutzerdetail einen Einmal-Link.
- E-Mail-Bestätigung ist automatisch aktiv, sobald SMTP konfiguriert ist.

## 7. PWA und Push-Benachrichtigungen

- Manifest (`/manifest.webmanifest`), Icons, Service Worker (`/sw.js`). Statische Assets werden zwischengespeichert, Seiten nie; `/api/*` wird nie gecacht. Offline erscheint eine Hinweisseite.
- Installierbar über HTTPS (Chrome/Edge/Android: „App installieren“; iPhone/iPad: Safari → Teilen → „Zum Home-Bildschirm“).

**Push einrichten (optional, standardmäßig aus):**

```bash
docker compose run --rm migrate npx web-push generate-vapid-keys
# Ausgabe in .env eintragen:
#   VAPID_PUBLIC_KEY=...
#   VAPID_PRIVATE_KEY=...
#   VAPID_SUBJECT=mailto:deine-adresse@example.org
docker compose up -d
```

- Ohne zusätzlichen Dienst möglich: Der App-Container sendet über das Web-Push-Protokoll direkt an den Push-Dienst des Browsers (Apple, Google, Mozilla). Ausgehender HTTPS-Zugriff des Containers ist nötig.
- Voraussetzungen Produktion: HTTPS, gültige VAPID-Schlüssel, Benutzer aktiviert Push bewusst per Klick (*Einstellungen → Benachrichtigungen*).
- **iOS/iPadOS:** ab 16.4, nur in der zum Home-Bildschirm hinzugefügten Web-App.
- Funktionen: Testnachricht, tägliche Erinnerung zu einer wählbaren Uhrzeit, Wochenhinweis montags. Inhalte nennen keine Mengen oder Promillewerte (Sperrbildschirm). Abgelaufene Abos (HTTP 404/410) werden automatisch entfernt.
- Die Erinnerungen versendet ein minütlicher Hintergrundjob im App-Prozess; ein Doppelversand wird über die Tabelle `user_notification` verhindert.

## 8. Sicherheit

- Serverseitige Validierung aller Eingaben (Zod), parametrisierte Datenbankzugriffe (Prisma).
- Autorisierung in jedem Route Handler; Eigentümerprüfung jedes Datensatzes (fremde IDs liefern 404).
- Admin-Bereich `/admin` nur mit serverseitig geprüfter Rolle; letzter Administrator ist vor Herabstufung/Deaktivierung/Löschung geschützt.
- CSRF: Origin-Prüfung für alle ändernden Anfragen + `SameSite=Lax`.
- Content Security Policy mit Nonce, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS bei HTTPS. Keine CORS-Freigaben.
- Fehlerantworten ohne interne Details (Referenz-ID im Log). Protokolle enthalten keine Passwörter, Tokens oder Konsumdetails; IP-Adressen gekürzt.
- Container: Nicht-Root, read-only, `no-new-privileges`, alle Capabilities entzogen, Datenbank nur im internen Netz.

## 9. Datenschutz (DSGVO)

Technisch umgesetzt: Einwilligung zur Verarbeitung von Konsum-/Körperdaten (Art. 9) im Onboarding mit Protokoll, Community-Ranking standardmäßig aktiv, im Onboarding und jederzeit abwählbar (Pseudonym möglich; Hinweis zur Einwilligung in docs/DATENSCHUTZ-BETRIEB.md), Datenexport (JSON) und Kontolöschung durch den Benutzer, Administratoren sehen keine einzelnen Konsumeinträge, keine Tracker, keine externen Schriftarten/CDNs.

**Noch vom Betreiber zu erledigen** (siehe [docs/DATENSCHUTZ-BETRIEB.md](docs/DATENSCHUTZ-BETRIEB.md)): Datenschutzhinweise und Impressum (`/datenschutz`, `/impressum` sind als **ungeprüfte Vorlagen** gekennzeichnet) mit Verantwortlichem und Rechtsgrundlagen ergänzen und prüfen lassen, Aufbewahrungsfrist für das Aktivitätsprotokoll festlegen, Verzeichnis von Verarbeitungstätigkeiten, ggf. Datenschutz-Folgenabschätzung.

## 10. Entwicklung und Tests

```bash
npm install
npm run db:dev               # eingebettete PostgreSQL auf Port 54329 (ohne Docker), eigenes Terminal
cp .env.example .env         # DATABASE_URL=postgresql://pegel:pegel@localhost:54329/pegel, COOKIE_SECURE=false, APP_URL=http://localhost:3000
npm run db:migrate && npm run db:seed
npm run dev                  # http://localhost:3000
```

Alternativ PostgreSQL per Docker: `docker compose -f compose.dev.yaml up -d`.

| Befehl | Inhalt |
|---|---|
| `npm run lint` | ESLint (inkl. React-Hooks-Regeln) |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit-Tests: Alkohol- und Widmark-Berechnung, Zeitzonen/Sommerzeit, Zeiträume, Statistik, Validierung, Berechtigungen |
| `npm run test:integration` | Integrationstests gegen echte PostgreSQL (eingebettet): Auth, Sitzungen, Onboarding, Getränke, Einträge, Kalender, Statistik, Community, Push, Admin, Audit, Export/Löschung |
| `npm run build && npm run test:e2e` | Playwright gegen den Standalone-Build mit frischer Datenbank |

E2E-Szenario 10 („Daten bleiben nach Neustart der Docker-Container erhalten“) prüft `scripts/verify-persistence.sh` auf dem Docker-Host.

## 11. Architektur und Projektstruktur

- **Next.js 16** (App Router, TypeScript, Turbopack, Standalone-Output), **Tailwind CSS 4**, eigene zugängliche UI-Komponenten, **Recharts**, **Zod**, **Prisma 7** mit PostgreSQL-Treiberadapter, **Better Auth**, **web-push**.
- Seiten sind Server Components und lesen über die Service-Schicht; Änderungen laufen über REST-Route-Handler (`/api/v1`) und aktualisieren die Ansicht per `router.refresh()`.

```
prisma/                 Schema, versionierte Migrationen, Seed
public/                 Service Worker, Offline-Seite, Icons
scripts/                Backup, Restore, Update, Persistenz-Check, Dev-/E2E-Datenbank, Icons
src/app/                Seiten (Route Groups (app), (auth), (info)), Route Handlers unter api/
src/components/         UI-Bausteine, Layout, Diagramme
src/features/           Feature-Module (auth, beverages, consumption, estimate, profile, settings, community, notifications, admin)
src/i18n/               Texte (Deutsch) – Struktur für weitere Sprachen
src/lib/calculations/   Alkohol- und Widmark-Berechnung (rein, getestet)
src/lib/                Zeitzonen/Zeiträume, Statistik-Aggregation, Validierung, Berechtigungen
src/server/             Auth, Datenbank, Audit, HTTP-Wrapper, Rate-Limit, Scheduler, Services
tests/                  unit/, integration/, e2e/
docs/                   Berechnungsmodell, Datenschutz-Betrieb
```

Details zum Modell: [docs/BERECHNUNG.md](docs/BERECHNUNG.md).

## Sparschwein

Für jeden abgeschlossenen Kalendertag ohne erfasste Getränke gibt es `SAVINGS_PER_DAY` (5 €), für jede volle Woche am Stück (7., 14., 21. … Tag einer Serie) zusätzlich `SAVINGS_WEEK_BONUS` (10 €) und für jeden kompletten Kalendermonat ohne Eintrag `SAVINGS_MONTH_BONUS` (20 €). Gezählt wird ab dem Registrierungstag bis gestern in der Zeitzone des Benutzers; der heutige Tag kommt nach Mitternacht dazu, ein angebrochener Monat (z. B. Registrierung am 15.) bringt keinen Monatsbonus. Gezählt werden *erfasste* Tage – wer nichts einträgt, spart scheinbar. Anzeige auf Übersicht und Community-Seite, Ranking unter den Community-Teilnehmenden (letzte 7 bzw. 30 abgeschlossene Tage oder gesamt). Berechnung: `src/lib/savings.ts`.

## 12. Bekannte Grenzen

- Das Rate-Limit eigener API-Endpunkte liegt im Speicher (ein App-Container). Für mehrere Instanzen müsste es in die Datenbank oder Redis.
- Hintergrundjobs (Erinnerungen) laufen im App-Prozess; bei mehreren Instanzen nur in einer aktivieren (`SCHEDULER_ENABLED=false` in den übrigen).
- Die Oberfläche ist auf Deutsch; weitere Sprachen erfordern eine Übersetzung von `src/i18n/de.ts`.

## Lizenz

[MIT](LICENSE) © 2026 Markus Hartmann. Die Promille-Werte sind Schätzungen ohne Gewähr – siehe Hinweise oben und [docs/BERECHNUNG.md](docs/BERECHNUNG.md).
